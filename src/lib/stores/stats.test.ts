import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory persistence so the store's read-modify-write goes through a real
// async round-trip without touching the Tauri plugin.
const store = new Map<string, unknown>();
vi.mock('$lib/services/persistence', () => ({
	getData: vi.fn(async (k: string) => (store.has(k) ? structuredClone(store.get(k)) : null)),
	setData: vi.fn(async (k: string, v: unknown) => {
		store.set(k, structuredClone(v));
	})
}));

import { statsStore } from './stats.svelte';

// The store is a module singleton; isolate tests with a unique gameId each.
let n = 0;
const freshGame = () => `g${n++}`;

beforeEach(() => store.clear());

describe('statsStore', () => {
	it('records a win: increments played/won/streak and sets best time', async () => {
		const g = freshGame();
		await statsStore.recordWin(g, 'easy', 1000, 0);
		const s = statsStore.getStats(g);
		expect(s.gamesPlayed).toBe(1);
		expect(s.gamesWon).toBe(1);
		expect(s.currentStreak).toBe(1);
		expect(s.bestStreak).toBe(1);
		expect(s.bestTimeMs.easy).toBe(1000);
		expect(s.byDifficulty.easy).toMatchObject({ played: 1, won: 1, bestTimeMs: 1000, totalTimeMs: 1000 });
	});

	it('serializes concurrent writes (no lost update / streak race)', async () => {
		const g = freshGame();
		// Fire without awaiting between — they must queue, not race.
		const p1 = statsStore.recordWin(g, 'easy', 1000, 0);
		const p2 = statsStore.recordWin(g, 'easy', 2000, 0);
		await Promise.all([p1, p2]);
		const s = statsStore.getStats(g);
		expect(s.gamesPlayed).toBe(2);
		expect(s.gamesWon).toBe(2);
		expect(s.currentStreak).toBe(2); // both increments survived
		expect(s.bestTimeMs.easy).toBe(1000); // faster of the two
		expect(s.byDifficulty.easy.totalTimeMs).toBe(3000);
	});

	it('resets currentStreak on a loss but keeps bestStreak', async () => {
		const g = freshGame();
		await statsStore.recordWin(g, 'easy', 1000, 0);
		await statsStore.recordWin(g, 'easy', 1000, 0);
		await statsStore.recordLoss(g);
		const s = statsStore.getStats(g);
		expect(s.gamesPlayed).toBe(3);
		expect(s.gamesWon).toBe(2);
		expect(s.currentStreak).toBe(0);
		expect(s.bestStreak).toBe(2);
	});

	it('updates best time only when a faster time arrives', async () => {
		const g = freshGame();
		await statsStore.recordWin(g, 'medium', 5000, 0);
		await statsStore.recordWin(g, 'medium', 8000, 0); // slower — must not overwrite
		expect(statsStore.getStats(g).bestTimeMs.medium).toBe(5000);
		await statsStore.recordWin(g, 'medium', 3000, 0); // faster — overwrites
		expect(statsStore.getStats(g).bestTimeMs.medium).toBe(3000);
		expect(statsStore.getStats(g).byDifficulty.medium.bestTimeMs).toBe(3000);
	});

	it('continues the write queue even after a rejected write', async () => {
		const g = freshGame();
		const persistence = await import('$lib/services/persistence');
		const setData = vi.mocked(persistence.setData);
		// First write rejects; the queue uses .then(fn, fn) so the next still runs.
		setData.mockRejectedValueOnce(new Error('disk full'));
		await statsStore.recordWin(g, 'easy', 1000, 0).catch(() => {});
		await statsStore.recordWin(g, 'easy', 1000, 0);
		// Second write succeeded; in-memory stats reflect both record attempts.
		expect(statsStore.getStats(g).gamesPlayed).toBe(2);
	});

	it('migrates a legacy save on load (mergeGameStats integration)', async () => {
		const g = freshGame();
		// Pre-seed a save missing the `hard` keys / totalTimeMs.
		store.set(`stats:${g}`, {
			gamesPlayed: 4,
			gamesWon: 2,
			bestTimeMs: { easy: 1500, medium: 2500 },
			byDifficulty: { easy: { played: 4, won: 2, bestTimeMs: 1500 } }
		});
		const s = await statsStore.load(g);
		expect(s.gamesPlayed).toBe(4);
		expect(s.bestTimeMs.hard).toBeNull();
		expect(s.byDifficulty.easy.totalTimeMs).toBe(0);
		expect(s.byDifficulty.hard).toEqual({ played: 0, won: 0, bestTimeMs: null, totalTimeMs: 0 });
	});
});
