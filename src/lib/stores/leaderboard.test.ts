import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('$lib/services/persistence', () => ({
	getData: vi.fn(async (k: string) => (store.has(k) ? structuredClone(store.get(k)) : null)),
	setData: vi.fn(async (k: string, v: unknown) => {
		store.set(k, structuredClone(v));
	})
}));

import { leaderboardStore } from './leaderboard.svelte';
import type { Difficulty } from '$lib/types/game';

// Module singleton — isolate with a unique gameId per test.
let n = 0;
const freshGame = () => `lb${n++}`;
const D: Difficulty = 'easy';
const SIZE = 10;

beforeEach(() => store.clear());

const times = (g: string) =>
	leaderboardStore.getEntries(g, D, SIZE).map((e) => e.timeMs);

describe('leaderboardStore.addEntry', () => {
	it('inserts the first entry at rank 0', async () => {
		const g = freshGame();
		const idx = await leaderboardStore.addEntry(g, D, SIZE, 1000, 0);
		expect(idx).toBe(0);
		expect(times(g)).toEqual([1000]);
	});

	it('keeps entries sorted ascending by time and returns the insert rank', async () => {
		const g = freshGame();
		expect(await leaderboardStore.addEntry(g, D, SIZE, 3000, 0)).toBe(0);
		expect(await leaderboardStore.addEntry(g, D, SIZE, 1000, 0)).toBe(0); // fastest → front
		expect(await leaderboardStore.addEntry(g, D, SIZE, 2000, 0)).toBe(1); // middle
		expect(times(g)).toEqual([1000, 2000, 3000]);
	});

	it('places a tie after the existing equal time', async () => {
		const g = freshGame();
		await leaderboardStore.addEntry(g, D, SIZE, 1000, 0);
		const idx = await leaderboardStore.addEntry(g, D, SIZE, 1000, 1); // tie
		expect(idx).toBe(1); // strict `<` → new entry sorts after the equal one
		expect(times(g)).toEqual([1000, 1000]);
	});

	it('caps the board at 10 entries, evicting the slowest when a faster time lands', async () => {
		const g = freshGame();
		// Fill with 1000..10000.
		for (let i = 1; i <= 10; i++) await leaderboardStore.addEntry(g, D, SIZE, i * 1000, 0);
		expect(times(g).length).toBe(10);
		const idx = await leaderboardStore.addEntry(g, D, SIZE, 500, 0); // new fastest
		expect(idx).toBe(0);
		expect(times(g).length).toBe(10); // still capped
		expect(times(g)[0]).toBe(500);
		expect(times(g).includes(10000)).toBe(false); // slowest evicted
	});

	it('rejects a time that would land beyond rank 10 (returns null, board unchanged)', async () => {
		const g = freshGame();
		for (let i = 1; i <= 10; i++) await leaderboardStore.addEntry(g, D, SIZE, i * 1000, 0);
		const before = times(g);
		const idx = await leaderboardStore.addEntry(g, D, SIZE, 99000, 0); // slower than all 10
		expect(idx).toBeNull();
		expect(times(g)).toEqual(before); // untouched
	});

	it('getEntries returns [] for an unknown key', () => {
		expect(leaderboardStore.getEntries('never-played', 'hard', 4)).toEqual([]);
	});
});
