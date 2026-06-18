import { describe, it, expect, vi, beforeEach } from 'vitest';

// Covers the async concurrency guards in requestHint / requestCheck / checkWin,
// plus the nonogram-specific win trigger (filled count must equal the clue sum).
// Tauri services are mocked with hand-resolved promises to force ordering.

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

// 2x2 with one filled cell per row/col → expectedFilled = 2.
const mockPuzzle = {
	rows: 2,
	cols: 2,
	row_clues: [[1], [1]],
	col_clues: [[1], [1]],
	difficulty: 'medium',
	title: null
};

let hintQueue: Deferred<unknown>[] = [];
let checkQueue: Deferred<unknown>[] = [];
let validateQueue: Deferred<boolean>[] = [];

vi.mock('$lib/services/nonogram-tauri', () => ({
	generateNonogramPuzzle: vi.fn(async () => structuredClone(mockPuzzle)),
	generateNonogramPicture: vi.fn(async () => structuredClone(mockPuzzle)),
	getNonogramHint: vi.fn(() => {
		const d = deferred<unknown>();
		hintQueue.push(d);
		return d.promise;
	}),
	checkNonogramErrors: vi.fn(() => {
		const d = deferred<unknown>();
		checkQueue.push(d);
		return d.promise;
	}),
	validateNonogramSolution: vi.fn(() => {
		const d = deferred<boolean>();
		validateQueue.push(d);
		return d.promise;
	})
}));

import { nonogramState } from './state.svelte';

const tick = () => new Promise((r) => setTimeout(r, 5));

beforeEach(() => {
	hintQueue = [];
	checkQueue = [];
	validateQueue = [];
});

function fillCell(r: number, c: number, mode: 'fill' | 'mark' = 'fill') {
	nonogramState.startStroke(r, c, mode);
	nonogramState.endStroke();
}

function completeGrid() {
	fillCell(0, 0);
	fillCell(1, 1); // filledCount === expectedFilled (2)
}

describe('nonogram requestCheck stale-seq guard', () => {
	it('keeps only the latest check result when two resolve out of order', async () => {
		await nonogramState.startNewGame('medium', 2, 2);
		const p1 = nonogramState.requestCheck();
		const p2 = nonogramState.requestCheck();

		checkQueue[1].resolve([[0, 0]]);
		await p2;
		checkQueue[0].resolve([[1, 1]]);
		await p1;

		expect(nonogramState.hasError(0, 0)).toBe(true);
		expect(nonogramState.hasError(1, 1)).toBe(false);
	});
});

describe('nonogram requestHint guards', () => {
	it('rejects a second concurrent hint while one is in flight', async () => {
		await nonogramState.startNewGame('medium', 2, 2);
		const p1 = nonogramState.requestHint();
		const p2 = nonogramState.requestHint();
		expect(await p2).toBe(false);
		hintQueue[0].resolve({ row: 0, col: 0, filled: true });
		expect(await p1).toBe(true);
	});

	it('drops its result if the player touched the target cell meanwhile', async () => {
		await nonogramState.startNewGame('medium', 2, 2);
		const p = nonogramState.requestHint();
		fillCell(0, 0); // player fills the hint's target first
		hintQueue[0].resolve({ row: 0, col: 0, filled: true });
		expect(await p).toBe(false);
		expect(nonogramState.grid[0][0]).toBe('filled');
	});
});

describe('nonogram checkWin guards', () => {
	it('flips isComplete only when filled count matches the clue sum and validation passes', async () => {
		await nonogramState.startNewGame('medium', 2, 2);
		fillCell(0, 0); // filledCount 1 < expected 2 → no validation yet
		await tick();
		expect(validateQueue.length).toBe(0);

		fillCell(1, 1); // now filledCount === 2 → checkWin schedules
		await tick();
		expect(validateQueue.length).toBe(1);
		validateQueue[0].resolve(true);
		await tick();
		expect(nonogramState.isComplete).toBe(true);
	});

	it('does not flip isComplete if the grid changed before validation resolved', async () => {
		await nonogramState.startNewGame('medium', 2, 2);
		completeGrid();
		await tick();
		expect(validateQueue.length).toBe(1);
		fillCell(0, 1, 'mark'); // mutate while validation is in flight
		validateQueue[0].resolve(true);
		await tick();
		expect(nonogramState.isComplete).toBe(false);
	});
});
