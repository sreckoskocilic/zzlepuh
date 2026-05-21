import type { Difficulty, LeaderboardEntry } from '$lib/types/game';
import { getData, setData } from '$lib/services/persistence';

const MAX_ENTRIES = 10;

class LeaderboardStore {
	private boards = $state<Record<string, LeaderboardEntry[]>>({});

	private key(gameId: string, difficulty: Difficulty, gridSize: number): string {
		return `leaderboard:${gameId}:${difficulty}:${gridSize}`;
	}

	async load(gameId: string, difficulty: Difficulty, gridSize: number): Promise<LeaderboardEntry[]> {
		const k = this.key(gameId, difficulty, gridSize);
		if (this.boards[k]) return this.boards[k];

		const saved = await getData<LeaderboardEntry[]>(k);
		const entries = saved ?? [];
		this.boards[k] = entries;
		return entries;
	}

	async addEntry(
		gameId: string,
		difficulty: Difficulty,
		gridSize: number,
		timeMs: number,
		hintsUsed: number
	): Promise<number | null> {
		const k = this.key(gameId, difficulty, gridSize);
		const entries = await this.load(gameId, difficulty, gridSize);

		const entry: LeaderboardEntry = {
			timeMs,
			hintsUsed,
			date: new Date().toISOString()
		};

		const insertIdx = entries.findIndex(e => timeMs < e.timeMs);
		const idx = insertIdx === -1 ? entries.length : insertIdx;

		if (idx >= MAX_ENTRIES) return null;

		entries.splice(idx, 0, entry);
		if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;

		this.boards[k] = [...entries];
		await setData(k, entries);

		return idx;
	}

	getEntries(gameId: string, difficulty: Difficulty, gridSize: number): LeaderboardEntry[] {
		return this.boards[this.key(gameId, difficulty, gridSize)] ?? [];
	}
}

export const leaderboardStore = new LeaderboardStore();
