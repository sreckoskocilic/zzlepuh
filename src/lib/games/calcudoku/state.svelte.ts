import type { CalcudokuPuzzle } from '$lib/types/calcudoku';
import type { Difficulty } from '$lib/types/game';
import {
	generateCalcudokuPuzzle,
	validateCalcudokuSolution,
	getCalcudokuHint,
	checkCalcudokuErrors
} from '$lib/services/calcudoku-tauri';

interface CellChange {
	row: number;
	col: number;
	prevValue: number;
	nextValue: number;
	prevNotes: number[];
	nextNotes: number[];
}

interface Move {
	changes: CellChange[];
}

function emptyNotes(size: number): number[][][] {
	return Array.from({ length: size }, () =>
		Array.from({ length: size }, () => [] as number[])
	);
}

class CalcudokuState {
	puzzle = $state<CalcudokuPuzzle | null>(null);
	grid = $state<number[][]>([]);
	notes = $state<number[][][]>([]);
	selectedCell = $state<[number, number] | null>(null);
	notesMode = $state(false);
	isComplete = $state(false);
	hintsUsed = $state(0);
	isGenerating = $state(false);
	error = $state<string | null>(null);
	errorCells = $state<Set<string>>(new Set());
	private gameId = 0;
	get currentGameId() {
		return this.gameId;
	}
	private isValidating = false;
	private errorTimeout: ReturnType<typeof setTimeout> | null = null;
	private history = $state<Move[]>([]);
	private redoStack = $state<Move[]>([]);

	get isActive(): boolean {
		return this.puzzle !== null && !this.isComplete;
	}

	get canUndo(): boolean {
		return this.history.length > 0;
	}

	get canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	async startNewGame(difficulty: Difficulty, size?: number): Promise<void> {
		if (this.isGenerating) return;
		this.isGenerating = true;
		this.error = null;
		if (this.errorTimeout) {
			clearTimeout(this.errorTimeout);
			this.errorTimeout = null;
		}
		this.errorCells = new Set();
		this.selectedCell = null;

		try {
			const puzzle = await generateCalcudokuPuzzle(difficulty, size);
			this.puzzle = puzzle;
			this.grid = Array.from({ length: puzzle.size }, () =>
				Array.from({ length: puzzle.size }, () => 0)
			);
			this.notes = emptyNotes(puzzle.size);
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

	selectCell(row: number, col: number): void {
		if (!this.puzzle || this.isComplete) return;
		if (this.selectedCell && this.selectedCell[0] === row && this.selectedCell[1] === col) {
			this.selectedCell = null;
		} else {
			this.selectedCell = [row, col];
		}
	}

	enterNumber(value: number, asNote?: boolean): void {
		if (!this.puzzle || this.isComplete || !this.selectedCell) return;
		const [row, col] = this.selectedCell;
		if (value < 1 || value > this.puzzle.size) return;

		const isNote = asNote ?? this.notesMode;

		if (isNote) {
			if (this.grid[row][col] !== 0) return;
			const prevValue = this.grid[row][col];
			const prevNotes = [...this.notes[row][col]];
			const current = [...prevNotes];
			const idx = current.indexOf(value);
			if (idx >= 0) {
				current.splice(idx, 1);
			} else {
				current.push(value);
				current.sort((a, b) => a - b);
			}

			this.history.push({
				changes: [
					{ row, col, prevValue, nextValue: 0, prevNotes, nextNotes: [...current] }
				]
			});
			this.grid[row][col] = 0;
			this.notes[row][col] = current;
			this.redoStack = [];
		} else {
			const prev = this.grid[row][col];
			if (prev === value) return;
			const prevNotes = [...this.notes[row][col]];

			this.history.push({
				changes: [
					{ row, col, prevValue: prev, nextValue: value, prevNotes, nextNotes: [] }
				]
			});
			this.grid[row][col] = value;
			this.notes[row][col] = [];
			this.redoStack = [];
			this.checkWin();
		}
	}

	clearCell(): void {
		if (!this.puzzle || this.isComplete || !this.selectedCell) return;
		const [row, col] = this.selectedCell;
		const prevValue = this.grid[row][col];
		const prevNotes = [...this.notes[row][col]];
		if (prevValue === 0 && prevNotes.length === 0) return;

		this.history.push({
			changes: [{ row, col, prevValue, nextValue: 0, prevNotes, nextNotes: [] }]
		});
		this.grid[row][col] = 0;
		this.notes[row][col] = [];
		this.redoStack = [];
	}

	async requestHint(): Promise<boolean> {
		if (!this.puzzle) return false;
		const capturedGameId = this.gameId;

		try {
			const hint = await getCalcudokuHint(this.grid, this.puzzle);
			if (!hint || this.gameId !== capturedGameId) return false;

			const prev = this.grid[hint.row][hint.col];
			const prevNotes = [...this.notes[hint.row][hint.col]];
			this.history.push({
				changes: [
					{
						row: hint.row,
						col: hint.col,
						prevValue: prev,
						nextValue: hint.value,
						prevNotes,
						nextNotes: []
					}
				]
			});
			this.grid[hint.row][hint.col] = hint.value;
			this.notes[hint.row][hint.col] = [];
			this.hintsUsed++;
			this.selectedCell = [hint.row, hint.col];
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
			const errors = await checkCalcudokuErrors(this.grid, this.puzzle);
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
			const { row, col, prevValue, prevNotes } = move.changes[i];
			this.grid[row][col] = prevValue;
			this.notes[row][col] = [...prevNotes];
		}
		this.redoStack.push(move);
		if (this.isComplete) this.isComplete = false;
	}

	redo(): void {
		if (!this.redoStack.length || !this.puzzle) return;
		const move = this.redoStack.pop()!;
		for (const { row, col, nextValue, nextNotes } of move.changes) {
			this.grid[row][col] = nextValue;
			this.notes[row][col] = [...nextNotes];
		}
		this.history.push(move);
	}

	reset(): void {
		if (!this.puzzle) return;
		this.grid = Array.from({ length: this.puzzle.size }, () =>
			Array.from({ length: this.puzzle!.size }, () => 0)
		);
		this.notes = emptyNotes(this.puzzle.size);
		this.isComplete = false;
		this.errorCells = new Set();
		this.selectedCell = null;
		this.history = [];
		this.redoStack = [];
	}

	private checkWin(): void {
		if (!this.puzzle || this.isValidating) return;
		const hasEmpty = this.grid.some((row) => row.some((cell) => cell === 0));
		if (hasEmpty) return;

		this.isValidating = true;
		const currentGameId = this.gameId;
		const puzzle = this.puzzle;
		const grid = this.grid.map((row) => [...row]);
		setTimeout(async () => {
			try {
				const valid = await validateCalcudokuSolution(grid, puzzle);
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

export const calcudokuState = new CalcudokuState();
