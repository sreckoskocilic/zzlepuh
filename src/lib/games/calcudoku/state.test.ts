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

const validateMock = vi.fn(async (..._args: unknown[]) => true);
vi.mock('$lib/services/calcudoku-tauri', () => ({
	generateCalcudokuPuzzle: vi.fn(async () => structuredClone(mockPuzzle)),
	validateCalcudokuSolution: (...a: unknown[]) => validateMock(...a),
	getCalcudokuHint: vi.fn(async () => null),
	checkCalcudokuErrors: vi.fn(async () => [])
}));

import { calcudokuState } from './state.svelte';

const tick = () => new Promise((r) => setTimeout(r, 5));

beforeEach(() => validateMock.mockClear());

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

		await tick(); // let checkWin's setTimeout(0) + awaited validate resolve
		expect(validateMock).toHaveBeenCalled();
		expect(calcudokuState.isComplete).toBe(true);
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
