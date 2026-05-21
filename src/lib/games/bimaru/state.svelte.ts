import type { BimaruPuzzle, CellValue, HintCell } from '$lib/types/bimaru';
import type { Difficulty } from '$lib/types/game';
import { generatePuzzle, validateSolution, getHint, checkErrors } from '$lib/services/tauri';
import { nextCellValue } from './logic';

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

	get isActive(): boolean {
		return this.puzzle !== null && !this.isComplete;
	}

	async startNewGame(difficulty: Difficulty, rows?: number, cols?: number): Promise<void> {
		this.isGenerating = true;
		this.error = null;

		try {
			const puzzle = await generatePuzzle(difficulty, rows, cols);
			this.puzzle = puzzle;
			this.grid = this.initGridFromHints(puzzle);
			this.isComplete = false;
			this.hintsUsed = 0;
			this.startedAt = Date.now();
			this.gameId++;
			this.isValidating = false;
		} catch (e) {
			this.error = String(e);
		} finally {
			this.isGenerating = false;
		}
	}

	cycleCell(row: number, col: number): void {
		if (!this.puzzle || this.isComplete) return;
		if (this.puzzle.hints[row][col] !== 'empty') return;

		this.grid[row][col] = nextCellValue(this.grid[row][col]);
		this.checkWin();
	}

	setCell(row: number, col: number, value: CellValue): void {
		if (!this.puzzle || this.isComplete) return;
		if (this.puzzle.hints[row][col] !== 'empty') return;

		this.grid[row][col] = value;
		this.checkWin();
	}

	async requestHint(): Promise<boolean> {
		if (!this.puzzle) return false;

		try {
			const hint = await getHint(
				this.grid,
				this.puzzle.row_clues,
				this.puzzle.col_clues,
				this.puzzle.fleet,
				this.puzzle.hints
			);

			if (!hint) return false;

			this.grid[hint.row][hint.col] = hint.value;
			this.hintsUsed++;
			this.checkWin();
			return true;
		} catch {
			return false;
		}
	}

	fillRowWater(row: number): void {
		if (!this.puzzle || this.isComplete) return;
		for (let c = 0; c < this.puzzle.cols; c++) {
			if (this.grid[row][c] === 'empty' && this.puzzle.hints[row][c] === 'empty') {
				this.grid[row][c] = 'water';
			}
		}
		this.checkWin();
	}

	fillColWater(col: number): void {
		if (!this.puzzle || this.isComplete) return;
		for (let r = 0; r < this.puzzle.rows; r++) {
			if (this.grid[r][col] === 'empty' && this.puzzle.hints[r][col] === 'empty') {
				this.grid[r][col] = 'water';
			}
		}
		this.checkWin();
	}

	async requestCheck(): Promise<void> {
		if (!this.puzzle) return;

		try {
			const errors = await checkErrors(
				this.grid,
				this.puzzle.row_clues,
				this.puzzle.col_clues,
				this.puzzle.fleet,
				this.puzzle.hints
			);

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
					this.isComplete = true;
				}
			} catch { /* validation failed */
			} finally {
				this.isValidating = false;
			}
		}, 0);
	}
}

export const bimaruState = new BimaruState();
