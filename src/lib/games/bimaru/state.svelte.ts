import type { BimaruPuzzle, CellValue, HintCell } from '$lib/types/bimaru';
import type { Difficulty } from '$lib/types/game';
import { generatePuzzle, validateSolution, getHint, checkErrors } from '$lib/services/bimaru-tauri';
import { UndoStack } from '$lib/stores/undo-stack.svelte';

interface CellChange {
	row: number;
	col: number;
	prev: CellValue;
	next: CellValue;
}

interface Move {
	changes: CellChange[];
}

class BimaruState {
	puzzle = $state<BimaruPuzzle | null>(null);
	grid = $state<CellValue[][]>([]);
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

	get isActive(): boolean {
		return this.puzzle !== null && !this.isComplete;
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
			const puzzle = await generatePuzzle(difficulty, rows, cols);
			this.puzzle = puzzle;
			this.grid = this.initGridFromHints(puzzle);
			this.isComplete = false;
			this.hintsUsed = 0;
			this.gameId++;
			this.isValidating = false;
			this.undoStack.clear();
		} catch (e) {
			this.error = String(e);
		} finally {
			this.isGenerating = false;
		}
	}

	placeShip(row: number, col: number): void {
		if (!this.puzzle || this.isComplete) return;
		if (this.puzzle.hints[row][col] !== 'empty') return;

		const changes: CellChange[] = [];
		const current = this.grid[row][col];
		const next: CellValue = current === 'ship' ? 'empty' : 'ship';

		changes.push({ row, col, prev: current, next });
		this.grid[row][col] = next;

		if (next === 'ship') {
			this.autoWaterDiagonals(row, col, changes);
		}

		this.undoStack.push({ changes });
		this.checkWin();
	}

	placeWater(row: number, col: number): void {
		if (!this.puzzle || this.isComplete) return;
		if (this.puzzle.hints[row][col] !== 'empty') return;

		const current = this.grid[row][col];
		const next: CellValue = current === 'water' ? 'empty' : 'water';

		this.undoStack.push({ changes: [{ row, col, prev: current, next }] });
		this.grid[row][col] = next;
		this.checkWin();
	}

	async requestHint(): Promise<boolean> {
		if (!this.puzzle || this.isHinting) return false;
		this.isHinting = true;
		const capturedGameId = this.gameId;

		try {
			const hint = await getHint(
				this.grid,
				this.puzzle.row_clues,
				this.puzzle.col_clues,
				this.puzzle.fleet,
				this.puzzle.hints
			);

			if (!hint || this.gameId !== capturedGameId) return false;
			// The deduction was computed against the grid at call time; if the player
			// has since filled the target cell, applying it would clobber their move.
			if (this.grid[hint.row][hint.col] !== 'empty') return false;

			const changes: CellChange[] = [];
			changes.push({ row: hint.row, col: hint.col, prev: this.grid[hint.row][hint.col], next: hint.value });
			this.grid[hint.row][hint.col] = hint.value;
			if (hint.value === 'ship') {
				this.autoWaterDiagonals(hint.row, hint.col, changes);
			}
			this.undoStack.push({ changes });
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

	fillRowWater(row: number): void {
		if (!this.puzzle || this.isComplete) return;
		const changes: CellChange[] = [];
		for (let c = 0; c < this.puzzle.cols; c++) {
			if (this.grid[row][c] === 'empty' && this.puzzle.hints[row][c] === 'empty') {
				changes.push({ row, col: c, prev: 'empty', next: 'water' });
				this.grid[row][c] = 'water';
			}
		}
		if (changes.length) {
			this.undoStack.push({ changes });
		}
		this.checkWin();
	}

	fillColWater(col: number): void {
		if (!this.puzzle || this.isComplete) return;
		const changes: CellChange[] = [];
		for (let r = 0; r < this.puzzle.rows; r++) {
			if (this.grid[r][col] === 'empty' && this.puzzle.hints[r][col] === 'empty') {
				changes.push({ row: r, col, prev: 'empty', next: 'water' });
				this.grid[r][col] = 'water';
			}
		}
		if (changes.length) {
			this.undoStack.push({ changes });
		}
		this.checkWin();
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

	async requestCheck(): Promise<void> {
		if (!this.puzzle) return;
		const capturedGameId = this.gameId;
		const seq = ++this.checkSeq;

		try {
			const errors = await checkErrors(
				this.grid,
				this.puzzle.row_clues,
				this.puzzle.col_clues,
				this.puzzle.fleet,
				this.puzzle.hints
			);

			// Bail if a newer check started (out-of-order resolution would otherwise
			// overwrite fresher errors with this stale result).
			if (this.gameId !== capturedGameId || seq !== this.checkSeq) return;
			if (this.errorTimeout) clearTimeout(this.errorTimeout);
			this.errorCells = new Set(errors.map(([r, c]) => `${r},${c}`));
			this.errorTimeout = setTimeout(() => {
				this.errorCells = new Set();
			}, 2500);
		} catch { /* check failed */ }
	}

	hasError(row: number, col: number): boolean {
		return this.errorCells.has(`${row},${col}`);
	}

	reset(): void {
		if (!this.puzzle) return;
		this.grid = this.initGridFromHints(this.puzzle);
		this.isComplete = false;
		this.errorCells = new Set();
		this.undoStack.clear();
	}

	private autoWaterDiagonals(row: number, col: number, changes: CellChange[]): void {
		const diags = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
		for (const [dr, dc] of diags) {
			const r = row + dr, c = col + dc;
			if (r >= 0 && r < this.puzzle!.rows && c >= 0 && c < this.puzzle!.cols) {
				if (this.grid[r][c] === 'empty' && this.puzzle!.hints[r][c] === 'empty') {
					changes.push({ row: r, col: c, prev: 'empty', next: 'water' });
					this.grid[r][c] = 'water';
				}
			}
		}
	}

	private initGridFromHints(puzzle: BimaruPuzzle): CellValue[][] {
		return puzzle.hints.map((row: HintCell[]) =>
			row.map((cell: HintCell) => {
				if (cell === 'water') return 'water' as CellValue;
				if (cell === 'ship') return 'ship' as CellValue;
				return 'empty' as CellValue;
			})
		);
	}

	private checkWin(): void {
		if (!this.puzzle || this.isValidating) return;

		const hasEmpty = this.grid.some((row: CellValue[]) =>
			row.some((cell: CellValue) => cell === 'empty')
		);
		if (hasEmpty) return;

		this.isValidating = true;
		const currentGameId = this.gameId;
		const puzzle = this.puzzle;
		const grid = this.grid.map((row) => [...row]);
		setTimeout(async () => {
			try {
				const valid = await validateSolution(
					grid,
					puzzle.row_clues,
					puzzle.col_clues,
					puzzle.fleet
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

export const bimaruState = new BimaruState();
