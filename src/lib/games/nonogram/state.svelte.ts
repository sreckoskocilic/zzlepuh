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

	get canUndo(): boolean {
		return this.history.length > 0 && !this.isComplete;
	}

	get canRedo(): boolean {
		return this.redoStack.length > 0 && !this.isComplete;
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
		this.checkWin();
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

			this.grid[hint.row][hint.col] = hint.filled ? 'filled' : 'marked';
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
		if (!this.history.length || !this.puzzle || this.isComplete) return;
		const move = this.history.pop()!;
		for (let i = move.changes.length - 1; i >= 0; i--) {
			const { row, col, prev } = move.changes[i];
			this.grid[row][col] = prev;
		}
		this.redoStack.push(move);
	}

	redo(): void {
		if (!this.redoStack.length || !this.puzzle || this.isComplete) return;
		const move = this.redoStack.pop()!;
		for (const { row, col, next } of move.changes) {
			this.grid[row][col] = next;
		}
		this.history.push(move);
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

		const hasEmpty = this.grid.some((row) => row.some((cell) => cell === 'empty'));
		if (hasEmpty) return;

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
