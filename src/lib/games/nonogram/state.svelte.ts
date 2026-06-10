import type { NonogramPuzzle, CellState } from '$lib/types/nonogram';
import type { Difficulty } from '$lib/types/game';
import {
	generateNonogramPuzzle,
	validateNonogramSolution,
	getNonogramHint,
	checkNonogramErrors
} from '$lib/services/nonogram-tauri';

interface CellChange {
	row: number;
	col: number;
	prev: CellState;
	next: CellState;
}

interface Move {
	changes: CellChange[];
}

class NonogramState {
	puzzle = $state<NonogramPuzzle | null>(null);
	grid = $state<CellState[][]>([]);
	isComplete = $state(false);
	hintsUsed = $state(0);
	isGenerating = $state(false);
	error = $state<string | null>(null);
	errorCells = $state<Set<string>>(new Set());
	private gameId = 0;
	get currentGameId() { return this.gameId; }
	private isValidating = false;
	private errorTimeout: ReturnType<typeof setTimeout> | null = null;
	private history = $state<Move[]>([]);
	private redoStack = $state<Move[]>([]);

	get isActive(): boolean {
		return this.puzzle !== null && !this.isComplete;
	}

	/** True while a win validation is in flight — the grid is full and being checked. */
	get isValidatingSolution(): boolean {
		return this.isValidating;
	}

	get canUndo(): boolean {
		return this.history.length > 0;
	}

	get canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	async startNewGame(difficulty: Difficulty, rows?: number, cols?: number): Promise<void> {
		if (this.isGenerating) return;
		this.isGenerating = true;
		this.error = null;
		if (this.errorTimeout) {
			clearTimeout(this.errorTimeout);
			this.errorTimeout = null;
		}
		this.errorCells = new Set();

		try {
			const puzzle = await generateNonogramPuzzle(difficulty, rows, cols);
			this.puzzle = puzzle;
			this.grid = Array.from({ length: puzzle.rows }, () =>
				Array.from({ length: puzzle.cols }, () => 'empty' as CellState)
			);
			this.isComplete = false;
			this.hintsUsed = 0;
			this.gameId++;
			this.isValidating = false;
			this.history = [];
			this.redoStack = [];
		} catch (e) {
			this.error = String(e);
		} finally {
			this.isGenerating = false;
		}
	}

	fillCell(row: number, col: number): void {
		if (!this.puzzle || this.isComplete) return;
		const current = this.grid[row][col];
		const next: CellState = current === 'filled' ? 'empty' : 'filled';
		this.history.push({ changes: [{ row, col, prev: current, next }] });
		this.grid[row][col] = next;
		this.redoStack = [];
		this.checkWin();
	}

	markCell(row: number, col: number): void {
		if (!this.puzzle || this.isComplete) return;
		const current = this.grid[row][col];
		const next: CellState = current === 'marked' ? 'empty' : 'marked';
		this.history.push({ changes: [{ row, col, prev: current, next }] });
		this.grid[row][col] = next;
		this.redoStack = [];
		if (this.grid.some((row) => row.some((c) => c === 'filled'))) {
			this.checkWin();
		}
	}

	async requestHint(): Promise<boolean> {
		if (!this.puzzle) return false;
		const capturedGameId = this.gameId;

		try {
			const hint = await getNonogramHint(
				this.grid,
				this.puzzle.row_clues,
				this.puzzle.col_clues
			);

			if (!hint || this.gameId !== capturedGameId) return false;

			const prev = this.grid[hint.row][hint.col];
			const next: CellState = hint.filled ? 'filled' : 'marked';
			this.history.push({ changes: [{ row: hint.row, col: hint.col, prev, next }] });
			this.grid[hint.row][hint.col] = next;
			this.redoStack = [];
			this.hintsUsed++;
			this.checkWin();
			return true;
		} catch (e) {
			console.error('requestHint failed', e);
			return false;
		}
	}

	async requestCheck(): Promise<void> {
		if (!this.puzzle) return;
		const capturedGameId = this.gameId;

		try {
			const errors = await checkNonogramErrors(
				this.grid,
				this.puzzle.row_clues,
				this.puzzle.col_clues
			);

			if (this.gameId !== capturedGameId) return;
			if (this.errorTimeout) clearTimeout(this.errorTimeout);
			this.errorCells = new Set(errors.map(([r, c]) => `${r},${c}`));
			this.errorTimeout = setTimeout(() => {
				this.errorCells = new Set();
			}, 2500);
		} catch {
			/* check failed */
		}
	}

	hasError(row: number, col: number): boolean {
		return this.errorCells.has(`${row},${col}`);
	}

	undo(): void {
		if (!this.history.length || !this.puzzle) return;
		const move = this.history.pop()!;
		for (let i = move.changes.length - 1; i >= 0; i--) {
			const { row, col, prev } = move.changes[i];
			this.grid[row][col] = prev;
		}
		this.redoStack.push(move);
		if (this.isComplete) this.isComplete = false;
	}

	redo(): void {
		if (!this.redoStack.length || !this.puzzle) return;
		const move = this.redoStack.pop()!;
		for (const { row, col, next } of move.changes) {
			this.grid[row][col] = next;
		}
		this.history.push(move);
	}

	markRemainingInRow(row: number): void {
		if (!this.puzzle || this.isComplete) return;
		const changes: CellChange[] = [];
		for (let c = 0; c < this.puzzle.cols; c++) {
			if (this.grid[row][c] === 'empty') {
				changes.push({ row, col: c, prev: 'empty', next: 'marked' });
				this.grid[row][c] = 'marked';
			}
		}
		if (changes.length === 0) return;
		this.history.push({ changes });
		this.redoStack = [];
		this.checkWin();
	}

	markRemainingInCol(col: number): void {
		if (!this.puzzle || this.isComplete) return;
		const changes: CellChange[] = [];
		for (let r = 0; r < this.puzzle.rows; r++) {
			if (this.grid[r][col] === 'empty') {
				changes.push({ row: r, col, prev: 'empty', next: 'marked' });
				this.grid[r][col] = 'marked';
			}
		}
		if (changes.length === 0) return;
		this.history.push({ changes });
		this.redoStack = [];
		this.checkWin();
	}

	reset(): void {
		if (!this.puzzle) return;
		this.grid = Array.from({ length: this.puzzle.rows }, () =>
			Array.from({ length: this.puzzle!.cols }, () => 'empty' as CellState)
		);
		this.isComplete = false;
		this.errorCells = new Set();
		this.history = [];
		this.redoStack = [];
	}

	private checkWin(): void {
		if (!this.puzzle || this.isValidating) return;

		// Wait until the filled count matches the clues before validating, so we
		// don't fire an invoke on every click. Blanks may stay empty or be X-marked.
		const expectedFilled = this.puzzle.row_clues.reduce(
			(sum, clue) => sum + clue.reduce((a, b) => a + b, 0),
			0
		);
		let filledCount = 0;
		for (const row of this.grid) {
			for (const cell of row) {
				if (cell === 'filled') filledCount++;
			}
		}
		if (filledCount !== expectedFilled) return;

		this.isValidating = true;
		const currentGameId = this.gameId;
		const puzzle = this.puzzle;
		const grid = this.grid.map((row) => [...row]);
		setTimeout(async () => {
			try {
				const valid = await validateNonogramSolution(
					grid,
					puzzle.row_clues,
					puzzle.col_clues
				);
				if (valid && this.gameId === currentGameId) {
					const gridUnchanged = this.grid.every((row, r) =>
						row.every((cell, c) => cell === grid[r][c])
					);
					if (gridUnchanged) {
						this.isComplete = true;
					}
				}
			} catch (e) {
				console.error('checkWin validation failed', e);
			} finally {
				this.isValidating = false;
			}
		}, 0);
	}
}

export const nonogramState = new NonogramState();
