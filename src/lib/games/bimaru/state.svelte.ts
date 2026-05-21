import type { BimaruPuzzle, CellValue, HintCell } from '$lib/types/bimaru';
import type { Difficulty } from '$lib/types/game';
import { generatePuzzle, validateSolution, getHint, checkErrors } from '$lib/services/tauri';

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
	startedAt = $state<number | null>(null);
	isGenerating = $state(false);
	error = $state<string | null>(null);
	errorCells = $state<Set<string>>(new Set());
	private gameId = 0;
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
			const puzzle = await generatePuzzle(difficulty, rows, cols);
			this.puzzle = puzzle;
			this.grid = this.initGridFromHints(puzzle);
			this.isComplete = false;
			this.hintsUsed = 0;
			this.startedAt = Date.now();
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

		this.history.push({ changes });
		this.redoStack = [];
		this.checkWin();
	}

	placeWater(row: number, col: number): void {
		if (!this.puzzle || this.isComplete) return;
		if (this.puzzle.hints[row][col] !== 'empty') return;

		const current = this.grid[row][col];
		const next: CellValue = current === 'water' ? 'empty' : 'water';

		this.history.push({ changes: [{ row, col, prev: current, next }] });
		this.grid[row][col] = next;
		this.redoStack = [];
		this.checkWin();
	}

	cycleCell(row: number, col: number): void {
		this.placeShip(row, col);
	}

	setCell(row: number, col: number, value: CellValue): void {
		if (!this.puzzle || this.isComplete) return;
		if (this.puzzle.hints[row][col] !== 'empty') return;

		this.grid[row][col] = value;
		this.checkWin();
	}

	async requestHint(): Promise<boolean> {
		if (!this.puzzle) return false;
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

			this.grid[hint.row][hint.col] = hint.value;
			if (hint.value === 'ship') {
				this.autoWaterDiagonalsNoTrack(hint.row, hint.col);
			}
			this.hintsUsed++;
			this.checkWin();
			return true;
		} catch (e) {
			console.error('requestHint failed', e);
			return false;
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
			this.history.push({ changes });
			this.redoStack = [];
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
			this.history.push({ changes });
			this.redoStack = [];
		}
		this.checkWin();
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

	async requestCheck(): Promise<void> {
		if (!this.puzzle) return;
		const capturedGameId = this.gameId;

		try {
			const errors = await checkErrors(
				this.grid,
				this.puzzle.row_clues,
				this.puzzle.col_clues,
				this.puzzle.fleet,
				this.puzzle.hints
			);

			if (this.gameId !== capturedGameId) return;
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
		this.history = [];
		this.redoStack = [];
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

	private autoWaterDiagonalsNoTrack(row: number, col: number): void {
		const diags = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
		for (const [dr, dc] of diags) {
			const r = row + dr, c = col + dc;
			if (r >= 0 && r < this.puzzle!.rows && c >= 0 && c < this.puzzle!.cols) {
				if (this.grid[r][c] === 'empty' && this.puzzle!.hints[r][c] === 'empty') {
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
					const stillFilled = !this.grid.some((row: CellValue[]) =>
						row.some((cell: CellValue) => cell === 'empty')
					);
					if (stillFilled) {
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
