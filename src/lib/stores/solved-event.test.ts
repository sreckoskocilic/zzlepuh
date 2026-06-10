import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mimics exactly what the page win-effect does on a solved puzzle:
//   await statsStore.recordWin(game, difficulty, ms, hints)
//   await leaderboardStore.addEntry(game, difficulty, size, ms, hints)
// against an in-memory persistence so we can read back what got written.
const store = new Map<string, unknown>();
vi.mock('$lib/services/persistence', () => ({
	getData: vi.fn(async (k: string) => (store.has(k) ? structuredClone(store.get(k)) : null)),
	setData: vi.fn(async (k: string, v: unknown) => {
		store.set(k, structuredClone(v));
	})
}));

import { statsStore } from './stats.svelte';
import { leaderboardStore } from './leaderboard.svelte';

// Both stores are session-singletons that cache loaded data in memory; clear the
// persistence Map AND those caches so each test starts cold.
beforeEach(() => {
	store.clear();
	statsStore.stats = {};
	(leaderboardStore as unknown as { boards: Record<string, unknown> }).boards = {};
});

describe('puzzle-solved event persists', () => {
	it('calcudoku solve (medium 4×4, time set) writes stats + leaderboard', async () => {
		const game = 'calcudoku';
		const difficulty = 'medium';
		const size = 4;
		const ms = 87000; // 1:27
		const hints = 0;

		// --- this is the win-effect body ---
		await statsStore.recordWin(game, difficulty, ms, hints);
		const rank = await leaderboardStore.addEntry(game, difficulty, size, ms, hints);

		// stats persisted under stats:calcudoku
		const savedStats = store.get('stats:calcudoku') as Record<string, unknown> | undefined;
		expect(savedStats).toBeDefined();
		expect(savedStats!.gamesWon).toBe(1);
		expect((savedStats!.bestTimeMs as Record<string, number>).medium).toBe(87000);

		// leaderboard persisted under leaderboard:calcudoku:medium:4 with the entry
		const board = store.get('leaderboard:calcudoku:medium:4') as Array<{ timeMs: number }> | undefined;
		expect(board).toBeDefined();
		expect(board!.length).toBe(1);
		expect(board![0].timeMs).toBe(87000);
		expect(rank).toBe(0);

		// and it's readable through the store API the leaderboard panel uses
		expect(leaderboardStore.getEntries('calcudoku', 'medium', 4)[0].timeMs).toBe(87000);
	});

	it('three calcudoku solves accumulate, fastest ranks first', async () => {
		for (const ms of [120000, 60000, 90000]) {
			await statsStore.recordWin('calcudoku', 'medium', ms, 0);
			await leaderboardStore.addEntry('calcudoku', 'medium', 4, ms, 0);
		}
		expect((store.get('stats:calcudoku') as { gamesWon: number }).gamesWon).toBe(3);
		expect(leaderboardStore.getEntries('calcudoku', 'medium', 4).map((e) => e.timeMs)).toEqual([
			60000, 90000, 120000
		]);
	});
});
