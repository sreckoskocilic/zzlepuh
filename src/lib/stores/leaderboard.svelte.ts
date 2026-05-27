import type { Difficulty, LeaderboardEntry } from '$lib/types/game';
import { getData, setData } from '$lib/services/persistence';

const MAX_ENTRIES = 10;

class LeaderboardStore {
	private boards = $state<Record<string, LeaderboardEntry[]>>({});
	private pending = new Map<string, Promise<LeaderboardEntry[]>>();
	private writeQueue = new Map<string, Promise<unknown>>();

	private key(gameId: string, difficulty: Difficulty, gridSize: number): string {
		return `leaderboard:${gameId}:${difficulty}:${gridSize}`;
	}

	async load(gameId: string, difficulty: Difficulty, gridSize: number): Promise<LeaderboardEntry[]> {
		const k = this.key(gameId, difficulty, gridSize);
		if (this.boards[k]) return this.boards[k];
		if (!this.pending.has(k)) {
			this.pending.set(k, getData<LeaderboardEntry[]>(k).then(saved => {
				const entries = saved ?? [];
				this.boards[k] = entries;
				this.pending.delete(k);
				return entries;
			}));
		}
		return this.pending.get(k)!;
	}

	async addEntry(
		gameId: string,
		difficulty: Difficulty,
		gridSize: number,
		timeMs: number,
		hintsUsed: number
	): Promise<number | null> {
		const k = this.key(gameId, difficulty, gridSize);
		const prev = this.writeQueue.get(k) ?? Promise.resolve();
		const next = prev.then(async () => {
			const entries = this.boards[k] ?? await this.load(gameId, difficulty, gridSize);

			const entry: LeaderboardEntry = {
				timeMs,
				hintsUsed,
				date: new Date().toISOString()
			};

			const insertIdx = entries.findIndex(e => timeMs < e.timeMs);
			const idx = insertIdx === -1 ? entries.length : insertIdx;

			if (idx >= MAX_ENTRIES) return null;

			const updated = [...entries];
			updated.splice(idx, 0, entry);
			if (updated.length > MAX_ENTRIES) updated.length = MAX_ENTRIES;

			this.boards[k] = updated;
			await setData(k, updated);

			return idx;
		}, () => null);
		this.writeQueue.set(k, next);
		return next;
	}

	getEntries(gameId: string, difficulty: Difficulty, gridSize: number): LeaderboardEntry[] {
		return this.boards[this.key(gameId, difficulty, gridSize)] ?? [];
	}
}

export const leaderboardStore = new LeaderboardStore();
