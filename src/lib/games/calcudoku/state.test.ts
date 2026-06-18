import { describe, it, expect, vi, beforeEach } from 'vitest';

// Drive the real win-detection wiring (fill grid → checkWin → validate → isComplete)
// without the GUI. validate is stubbed true; the Rust validate logic is covered by
// cargo tests. This pins that completing a calcudoku flips isComplete (which is what
// the page win-effect keys off of to record stats/leaderboard).
const mockPuzzle = {
	size: 4,
	difficulty: 'medium',
	cages: [
		{ cells: [[0, 0], [0, 1]], operation: 'add', target: 3 },
		{ cells: [[0, 2], [0, 3]], operation: 'subtract', target: 1 },
		{ cells: [[1, 0], [1, 1]], operation: 'multiply', target: 12 },
		{ cells: [[1, 2], [2, 2]], operation: 'add', target: 5 },
		{ cells: [[1, 3], [2, 3]], operation: 'subtract', target: 1 },
		{ cells: [[2, 0], [3, 0]], operation: 'divide', target: 2 },
		{ cells: [[2, 1], [3, 1]], operation: 'subtract', target: 2 },
		{ cells: [[3, 2]], operation: 'none', target: 2 },
		{ cells: [[3, 3]], operation: 'none', target: 1 }
	]
};
const solution = [
	[1, 2, 3, 4],
	[3, 4, 1, 2],
	[2, 1, 4, 3],
	[4, 3, 2, 1]
];

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

const validateMock = vi.fn(async (..._args: unknown[]) => true);
// Overridable per-test so the concurrency-guard tests can hand-resolve them.
let getHintImpl: (...a: unknown[]) => Promise<unknown> = async () => null;
let checkErrorsImpl: (...a: unknown[]) => Promise<unknown> = async () => [];
vi.mock('$lib/services/calcudoku-tauri', () => ({
	generateCalcudokuPuzzle: vi.fn(async () => structuredClone(mockPuzzle)),
	validateCalcudokuSolution: (...a: unknown[]) => validateMock(...a),
	getCalcudokuHint: (...a: unknown[]) => getHintImpl(...a),
	checkCalcudokuErrors: (...a: unknown[]) => checkErrorsImpl(...a)
}));

import { calcudokuState } from './state.svelte';

const tick = () => new Promise((r) => setTimeout(r, 5));

beforeEach(() => {
	validateMock.mockClear();
	getHintImpl = async () => null;
	checkErrorsImpl = async () => [];
});

function fillSolution() {
	for (let r = 0; r < 4; r++) {
		for (let c = 0; c < 4; c++) {
			if (calcudokuState.isLocked(r, c)) continue;
			calcudokuState.selectCell(r, c);
			calcudokuState.enterNumber(solution[r][c]);
		}
	}
}

describe('calcudoku win detection', () => {
	it('flips isComplete once the grid is fully and correctly filled', async () => {
		await calcudokuState.startNewGame('medium', 4);
		expect(calcudokuState.isComplete).toBe(false);

		// Fill every non-locked cell with the solution value.
		for (let r = 0; r < 4; r++) {
			for (let c = 0; c < 4; c++) {
				if (calcudokuState.isLocked(r, c)) continue;
				calcudokuState.selectCell(r, c);
				calcudokuState.enterNumber(solution[r][c]);
			}
		}

		// Poll the condition rather than racing a fixed sleep against the
		// setTimeout(0) + awaited validate chain (avoids CI-load flake).
		await vi.waitFor(() => expect(calcudokuState.isComplete).toBe(true));
		expect(validateMock).toHaveBeenCalled();
	});

	it('does not validate while any cell is still empty', async () => {
		await calcudokuState.startNewGame('medium', 4);
		// Fill all but one non-locked cell.
		let skipped = false;
		for (let r = 0; r < 4; r++) {
			for (let c = 0; c < 4; c++) {
				if (calcudokuState.isLocked(r, c)) continue;
				if (!skipped) {
					skipped = true;
					continue;
				}
				calcudokuState.selectCell(r, c);
				calcudokuState.enterNumber(solution[r][c]);
			}
		}
		await tick();
		expect(validateMock).not.toHaveBeenCalled();
		expect(calcudokuState.isComplete).toBe(false);
	});
});

describe('calcudoku requestCheck stale-seq guard', () => {
	it('keeps only the latest check result when two resolve out of order', async () => {
		const q: Deferred<unknown>[] = [];
		checkErrorsImpl = () => {
			const d = deferred<unknown>();
			q.push(d);
			return d.promise;
		};
		await calcudokuState.startNewGame('medium', 4);
		const p1 = calcudokuState.requestCheck();
		const p2 = calcudokuState.requestCheck();

		q[1].resolve([[0, 0]]);
		await p2;
		q[0].resolve([[1, 1]]);
		await p1;

		expect(calcudokuState.hasError(0, 0)).toBe(true);
		expect(calcudokuState.hasError(1, 1)).toBe(false);
	});
});

describe('calcudoku requestHint guards', () => {
	it('rejects a second concurrent hint while one is in flight', async () => {
		const q: Deferred<unknown>[] = [];
		getHintImpl = () => {
			const d = deferred<unknown>();
			q.push(d);
			return d.promise;
		};
		await calcudokuState.startNewGame('medium', 4);
		const p1 = calcudokuState.requestHint();
		const p2 = calcudokuState.requestHint();
		expect(await p2).toBe(false);
		q[0].resolve({ row: 0, col: 0, value: solution[0][0] });
		expect(await p1).toBe(true);
	});

	it('drops its result if the player filled the target cell meanwhile', async () => {
		const q: Deferred<unknown>[] = [];
		getHintImpl = () => {
			const d = deferred<unknown>();
			q.push(d);
			return d.promise;
		};
		await calcudokuState.startNewGame('medium', 4);
		const p = calcudokuState.requestHint();
		calcudokuState.selectCell(0, 0);
		calcudokuState.enterNumber(2); // player claims the target cell first
		q[0].resolve({ row: 0, col: 0, value: solution[0][0] });
		expect(await p).toBe(false);
		expect(calcudokuState.grid[0][0]).toBe(2); // player's value survives
	});
});

describe('calcudoku checkWin grid-unchanged guard', () => {
	it('does not flip isComplete if the grid changed before validation resolved', async () => {
		const d = deferred<boolean>();
		validateMock.mockImplementationOnce(() => d.promise);
		await calcudokuState.startNewGame('medium', 4);
		fillSolution();
		await tick(); // checkWin's setTimeout(0) runs and calls validate (still pending)
		expect(validateMock).toHaveBeenCalled();

		calcudokuState.selectCell(0, 0);
		calcudokuState.enterNumber(2); // mutate while validation is in flight
		d.resolve(true);
		await tick();
		expect(calcudokuState.isComplete).toBe(false);
	});
});
