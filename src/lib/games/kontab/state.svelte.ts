import {
	kontabAiMove,
	kontabApplyMove,
	kontabLegalMoves,
	kontabNextDeal,
	startKontabGame
} from '$lib/services/kontab-tauri';
import { cardKey, type Card, type GameState, type Move, type MoveEvent } from '$lib/types/kontab';
import { statsStore } from '$lib/stores/stats.svelte';

const HUMAN = 0;
const AI_DELAY_MS = 550;
const CAPTURE_SHOW_MS = 2000;

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

class KontabState {
	numPlayers = $state(2);
	target = $state(51);
	game = $state<GameState | null>(null);
	legal = $state<Move[]>([]);
	lastEvent = $state<MoveEvent | null>(null);
	krugCaptures = $state<Card[][]>([]);
	thinking = $state(false);
	showDealSummary = $state(false);
	dealSummary = $state<MoveEvent | null>(null);
	error = $state<string | null>(null);
	busy = $state(false);

	private startedAt = 0;
	private resultRecorded = false;
	private movesInKrug = 0;

	get phase(): string {
		return this.game?.phase.kind ?? 'idle';
	}

	get isHumanTurn(): boolean {
		const g = this.game;
		return !!g && g.phase.kind === 'playing' && g.current === HUMAN && !this.thinking && !this.busy;
	}

	get gameOverLoser(): number | null {
		const p = this.game?.phase;
		return p && p.kind === 'game_over' ? p.loser : null;
	}

	get humanWon(): boolean | null {
		const loser = this.gameOverLoser;
		return loser === null ? null : loser !== HUMAN;
	}

	moveFor(card: Card): Move | undefined {
		return this.legal.find((m) => cardKey(m.card) === cardKey(card));
	}

	async newGame(numPlayers = this.numPlayers, target = this.target): Promise<void> {
		this.numPlayers = numPlayers;
		this.target = target;
		this.error = null;
		this.busy = true;
		this.resultRecorded = false;
		this.showDealSummary = false;
		this.dealSummary = null;
		this.lastEvent = null;
		this.krugCaptures = Array.from({ length: numPlayers }, () => []);
		this.movesInKrug = 0;
		this.startedAt = Date.now();
		try {
			this.game = await startKontabGame(numPlayers, target);
			await this.loop();
		} catch (e) {
			this.error = String(e);
		} finally {
			this.busy = false;
		}
	}

	async playCard(card: Card): Promise<void> {
		if (!this.isHumanTurn) return;
		const mv = this.moveFor(card);
		if (!mv) return;
		this.busy = true;
		try {
			await this.apply(card);
			if (this.lastEvent?.captured.length) await delay(CAPTURE_SHOW_MS);
			await this.loop();
		} catch (e) {
			this.error = String(e);
		} finally {
			this.busy = false;
		}
	}

	async continueDeal(): Promise<void> {
		if (!this.game || this.game.phase.kind !== 'deal_complete') return;
		this.busy = true;
		try {
			this.game = await kontabNextDeal($state.snapshot(this.game));
			this.krugCaptures = Array.from({ length: this.game.num_players }, () => []);
			this.movesInKrug = 0;
			this.showDealSummary = false;
			this.dealSummary = null;
			await this.loop();
		} catch (e) {
			this.error = String(e);
		} finally {
			this.busy = false;
		}
	}

	private async apply(card: Card): Promise<void> {
		const g = this.game;
		if (!g) return;
		const result = await kontabApplyMove($state.snapshot(g), card);
		const event = result.events[result.events.length - 1] ?? null;
		this.lastEvent = event;
		if (event) {
			const n = result.state.num_players;
			if (this.movesInKrug >= n) {
				this.krugCaptures = Array.from({ length: n }, () => []);
				this.movesInKrug = 0;
			}
			const next = this.krugCaptures.slice();
			next[event.player] = event.captured.length ? [event.card, ...event.captured] : [];
			this.krugCaptures = next;
			this.movesInKrug++;
		}
		this.game = result.state;
	}

	private async loop(): Promise<void> {
		while (this.game) {
			const g = this.game;
			if (g.phase.kind === 'deal_complete') {
				this.dealSummary = this.lastEvent;
				this.showDealSummary = true;
				return;
			}
			if (g.phase.kind === 'game_over') {
				this.recordResult();
				return;
			}
			if (g.current === HUMAN) {
				this.legal = await kontabLegalMoves($state.snapshot(g));
				return;
			}
			this.thinking = true;
			await delay(AI_DELAY_MS);
			const mv = await kontabAiMove($state.snapshot(this.game));
			await this.apply(mv.card);
			this.thinking = false;
			await delay(this.lastEvent?.captured.length ? CAPTURE_SHOW_MS : 0);
		}
	}

	private recordResult(): void {
		if (this.resultRecorded) return;
		this.resultRecorded = true;
		const won = this.humanWon;
		if (won === null) return;
		const timeMs = Date.now() - this.startedAt;
		if (won) {
			void statsStore.recordWin('kontab', 'medium', timeMs);
		} else {
			void statsStore.recordLoss('kontab');
		}
	}
}

export const kontabState = new KontabState();
