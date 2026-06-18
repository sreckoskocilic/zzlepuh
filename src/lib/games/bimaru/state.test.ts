import { describe, it, expect, vi, beforeEach } from 'vitest';

// Covers the async concurrency guards in requestHint / requestCheck / checkWin:
// in-flight rejection, stale-result rejection, target-cell protection, and the
// stale-game / grid-unchanged win guards. The Tauri services are mocked with
// hand-resolved promises so we can force out-of-order resolution.

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (v: T) => void;
}
function deferred<T>(): Deferred<T> {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

const mockPuzzle = {
	rows: 2,
	cols: 2,
	row_clues: [0, 0],
	col_clues: [0, 0],
	fleet: { ships: [] },
	hints: [
		['empty', 'empty'],
		['empty', 'empty']
	],
	difficulty: 'medium'
};

let hintQueue: Deferred<unknown>[] = [];
let checkQueue: Deferred<unknown>[] = [];
let validateQueue: Deferred<boolean>[] = [];

vi.mock('$lib/services/bimaru-tauri', () => ({
	generatePuzzle: vi.fn(async () => structuredClone(mockPuzzle)),
	getHint: vi.fn(() => {
		const d = deferred<unknown>();
		hintQueue.push(d);
		return d.promise;
	}),
	checkErrors: vi.fn(() => {
		const d = deferred<unknown>();
		checkQueue.push(d);
		return d.promise;
	}),
	validateSolution: vi.fn(() => {
		const d = deferred<boolean>();
		validateQueue.push(d);
		return d.promise;
	})
}));

import { bimaruState } from './state.svelte';

const tick = () => new Promise((r) => setTimeout(r, 5));

beforeEach(() => {
	hintQueue = [];
	checkQueue = [];
	validateQueue = [];
});

function fillGrid() {
	bimaruState.placeWater(0, 0);
	bimaruState.placeWater(0, 1);
	bimaruState.placeWater(1, 0);
	bimaruState.placeWater(1, 1);
}

describe('bimaru requestCheck stale-seq guard', () => {
	it('keeps only the latest check result when two resolve out of order', async () => {
		await bimaruState.startNewGame('medium', 2, 2);
		const p1 = bimaruState.requestCheck(); // seq 1
		const p2 = bimaruState.requestCheck(); // seq 2 (current)

		// Newer check resolves first, then the stale older one.
		checkQueue[1].resolve([[0, 0]]);
		await p2;
		checkQueue[0].resolve([[1, 1]]);
		await p1;

		expect(bimaruState.hasError(0, 0)).toBe(true);
		expect(bimaruState.hasError(1, 1)).toBe(false); // stale result must not paint
	});
});

describe('bimaru requestHint guards', () => {
	it('rejects a second concurrent hint while one is in flight', async () => {
		await bimaruState.startNewGame('medium', 2, 2);
		const p1 = bimaruState.requestHint();
		const p2 = bimaruState.requestHint();
		expect(await p2).toBe(false); // isHinting guard
		hintQueue[0].resolve({ row: 0, col: 0, value: 'ship' });
		expect(await p1).toBe(true);
	});

	it('drops its result if the player filled the target cell meanwhile', async () => {
		await bimaruState.startNewGame('medium', 2, 2);
		const p = bimaruState.requestHint();
		bimaruState.placeWater(0, 0); // player claims the hint's target first
		hintQueue[0].resolve({ row: 0, col: 0, value: 'ship' });
		expect(await p).toBe(false);
		expect(bimaruState.grid[0][0]).toBe('water'); // player's move survives
	});
});

describe('bimaru checkWin guards', () => {
	it('flips isComplete when the grid is completed and validation passes', async () => {
		await bimaruState.startNewGame('medium', 2, 2);
		fillGrid();
		await tick(); // let checkWin's setTimeout(0) run and call validate
		expect(validateQueue.length).toBe(1);
		validateQueue[0].resolve(true);
		await tick();
		expect(bimaruState.isComplete).toBe(true);
	});

	it('does not flip isComplete if the grid changed before validation resolved', async () => {
		await bimaruState.startNewGame('medium', 2, 2);
		fillGrid();
		await tick();
		expect(validateQueue.length).toBe(1);
		bimaruState.placeWater(1, 1); // mutate while validation is in flight
		validateQueue[0].resolve(true);
		await tick();
		expect(bimaruState.isComplete).toBe(false);
	});

	it('does not flip isComplete if a new game started before validation resolved', async () => {
		await bimaruState.startNewGame('medium', 2, 2);
		fillGrid();
		await tick();
		expect(validateQueue.length).toBe(1);
		await bimaruState.startNewGame('medium', 2, 2); // bumps gameId
		validateQueue[0].resolve(true);
		await tick();
		expect(bimaruState.isComplete).toBe(false);
	});
});
