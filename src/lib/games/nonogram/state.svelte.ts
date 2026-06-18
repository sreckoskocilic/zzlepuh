import type { NonogramPuzzle, CellState } from '$lib/types/nonogram';
import type { Difficulty } from '$lib/types/game';
import {
	generateNonogramPuzzle,
	generateNonogramPicture,
	validateNonogramSolution,
	getNonogramHint,
	checkNonogramErrors
} from '$lib/services/nonogram-tauri';
import { UndoStack } from '$lib/stores/undo-stack.svelte';

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
	private isHinting = false;
	private checkSeq = 0;
	private errorTimeout: ReturnType<typeof setTimeout> | null = null;
	private undoStack = new UndoStack<Move>();
	private stroke: { target: CellState; move: Move } | null = null;

	get isActive(): boolean {
		return this.puzzle !== null && !this.isComplete;
	}

	/** True when the current puzzle is a designed picture (difficulty "picture"). */
	get isPicture(): boolean {
		return this.puzzle?.difficulty === 'picture';
	}

	/** True while a win validation is in flight — the grid is full and being checked. */
	get isValidatingSolution(): boolean {
		return this.isValidating;
	}

	get canUndo(): boolean {
		return this.undoStack.canUndo;
	}

	get canRedo(): boolean {
		return this.undoStack.canRedo;
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
			this.loadPuzzle(await generateNonogramPuzzle(difficulty, rows, cols));
		} catch (e) {
			this.error = String(e);
		} finally {
			this.isGenerating = false;
		}
	}

	/** Start a designed picture puzzle by its catalog id. */
	async startPictureGame(id: string): Promise<void> {
		if (this.isGenerating) return;
		this.isGenerating = true;
		this.error = null;
		if (this.errorTimeout) {
			clearTimeout(this.errorTimeout);
			this.errorTimeout = null;
		}
		this.errorCells = new Set();

		try {
			this.loadPuzzle(await generateNonogramPicture(id));
		} catch (e) {
			this.error = String(e);
		} finally {
			this.isGenerating = false;
		}
	}

	private loadPuzzle(puzzle: NonogramPuzzle): void {
		this.puzzle = puzzle;
		this.grid = Array.from({ length: puzzle.rows }, () =>
			Array.from({ length: puzzle.cols }, () => 'empty' as CellState)
		);
		this.isComplete = false;
		this.hintsUsed = 0;
		this.gameId++;
		this.isValidating = false;
		this.undoStack.clear();
	}

	startStroke(row: number, col: number, mode: 'fill' | 'mark'): void {
		if (!this.puzzle || this.isComplete) return;
		const current = this.grid[row][col];
		const on: CellState = mode === 'fill' ? 'filled' : 'marked';
		const target: CellState = current === on ? 'empty' : on;
		this.stroke = { target, move: { changes: [] } };
		this.paint(row, col);
	}

	extendStroke(row: number, col: number): void {
		if (!this.stroke || !this.puzzle || this.isComplete) return;
		this.paint(row, col);
	}

	endStroke(): void {
		if (!this.stroke) return;
		const { move } = this.stroke;
		this.stroke = null;
		if (move.changes.length === 0) return;
		this.undoStack.push(move);
		this.checkWin();
	}

	private paint(row: number, col: number): void {
		if (!this.stroke) return;
		const current = this.grid[row][col];
		if (current === this.stroke.target) return;
		this.stroke.move.changes.push({ row, col, prev: current, next: this.stroke.target });
		this.grid[row][col] = this.stroke.target;
	}

	async requestHint(): Promise<boolean> {
		if (!this.puzzle || this.isHinting) return false;
		this.isHinting = true;
		const capturedGameId = this.gameId;

		try {
			const hint = await getNonogramHint(
				this.grid,
				this.puzzle.row_clues,
				this.puzzle.col_clues
			);

			if (!hint || this.gameId !== capturedGameId) return false;
			// The deduction was computed against the grid at call time; if the player
			// has since touched the target cell, applying it would clobber their move.
			if (this.grid[hint.row][hint.col] !== 'empty') return false;

			const prev = this.grid[hint.row][hint.col];
			const next: CellState = hint.filled ? 'filled' : 'marked';
			this.undoStack.push({ changes: [{ row: hint.row, col: hint.col, prev, next }] });
			this.grid[hint.row][hint.col] = next;
			this.hintsUsed++;
			this.checkWin();
			return true;
		} catch (e) {
			console.error('requestHint failed', e);
			return false;
		} finally {
			this.isHinting = false;
		}
	}

	async requestCheck(): Promise<void> {
		if (!this.puzzle) return;
		const capturedGameId = this.gameId;
		const seq = ++this.checkSeq;

		try {
			const errors = await checkNonogramErrors(
				this.grid,
				this.puzzle.row_clues,
				this.puzzle.col_clues
			);

			// Bail if a newer check started (out-of-order resolution would otherwise
			// overwrite fresher errors with this stale result).
			if (this.gameId !== capturedGameId || seq !== this.checkSeq) return;
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
		if (!this.puzzle) return;
		const undone = this.undoStack.undo((move) => {
			for (let i = move.changes.length - 1; i >= 0; i--) {
				const { row, col, prev } = move.changes[i];
				this.grid[row][col] = prev;
			}
		});
		if (undone && this.isComplete) this.isComplete = false;
	}

	redo(): void {
		if (!this.puzzle) return;
		this.undoStack.redo((move) => {
			for (const { row, col, next } of move.changes) {
				this.grid[row][col] = next;
			}
		});
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
		this.undoStack.push({ changes });
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
		this.undoStack.push({ changes });
		this.checkWin();
	}

	clearMarksInRow(row: number): void {
		if (!this.puzzle || this.isComplete) return;
		const changes: CellChange[] = [];
		for (let c = 0; c < this.puzzle.cols; c++) {
			if (this.grid[row][c] === 'marked') {
				changes.push({ row, col: c, prev: 'marked', next: 'empty' });
				this.grid[row][c] = 'empty';
			}
		}
		if (changes.length === 0) return;
		this.undoStack.push({ changes });
	}

	clearMarksInCol(col: number): void {
		if (!this.puzzle || this.isComplete) return;
		const changes: CellChange[] = [];
		for (let r = 0; r < this.puzzle.rows; r++) {
			if (this.grid[r][col] === 'marked') {
				changes.push({ row: r, col, prev: 'marked', next: 'empty' });
				this.grid[r][col] = 'empty';
			}
		}
		if (changes.length === 0) return;
		this.undoStack.push({ changes });
	}

	reset(): void {
		if (!this.puzzle) return;
		this.grid = Array.from({ length: this.puzzle.rows }, () =>
			Array.from({ length: this.puzzle!.cols }, () => 'empty' as CellState)
		);
		this.isComplete = false;
		this.errorCells = new Set();
		this.undoStack.clear();
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
