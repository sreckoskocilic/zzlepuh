import type { Difficulty, GameStats } from '$lib/types/game';
import { emptyGameStats, mergeGameStats } from '$lib/types/game';
import { getData, setData } from '$lib/services/persistence';

class StatsStore {
	stats = $state<Record<string, GameStats>>({});
	private pending = new Map<string, Promise<GameStats>>();
	private writeQueue = new Map<string, Promise<void>>();

	async load(gameId: string): Promise<GameStats> {
		if (this.stats[gameId]) return this.stats[gameId];
		if (!this.pending.has(gameId)) {
			this.pending.set(gameId, getData<GameStats>(`stats:${gameId}`).then(saved => {
				const s = mergeGameStats(saved);
				this.stats[gameId] = s;
				this.pending.delete(gameId);
				return s;
			}));
		}
		return this.pending.get(gameId)!;
	}

	private enqueue(gameId: string, fn: () => Promise<void>): Promise<void> {
		const prev = this.writeQueue.get(gameId) ?? Promise.resolve();
		const next = prev.then(fn, fn);
		this.writeQueue.set(gameId, next);
		return next;
	}

	async recordWin(gameId: string, difficulty: Difficulty, timeMs: number, _hintsUsed: number): Promise<void> {
		return this.enqueue(gameId, async () => {
			// $state.snapshot unwraps the reactive proxy to a plain object; a raw
			// structuredClone of the proxy throws DataCloneError.
			const s = $state.snapshot(await this.load(gameId)) as GameStats;
			s.gamesPlayed++;
			s.gamesWon++;
			s.currentStreak++;
			if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
			s.lastPlayedAt = new Date().toISOString();

			if (s.bestTimeMs[difficulty] === null || timeMs < s.bestTimeMs[difficulty]!) {
				s.bestTimeMs[difficulty] = timeMs;
			}

			const d = s.byDifficulty[difficulty];
			d.played++;
			d.won++;
			d.totalTimeMs += timeMs;
			if (d.bestTimeMs === null || timeMs < d.bestTimeMs) {
				d.bestTimeMs = timeMs;
			}

			this.stats[gameId] = s;
			await setData(`stats:${gameId}`, s);
		});
	}

	async recordLoss(gameId: string): Promise<void> {
		return this.enqueue(gameId, async () => {
			const s = $state.snapshot(await this.load(gameId)) as GameStats;
			s.gamesPlayed++;
			s.currentStreak = 0;
			s.lastPlayedAt = new Date().toISOString();

			this.stats[gameId] = s;
			await setData(`stats:${gameId}`, s);
		});
	}

	getStats(gameId: string): GameStats {
		return this.stats[gameId] ?? emptyGameStats();
	}
}

export const statsStore = new StatsStore();
