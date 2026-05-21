export type CellState = 'empty' | 'filled' | 'marked';

export interface NonogramPuzzle {
	rows: number;
	cols: number;
	row_clues: number[][];
	col_clues: number[][];
	difficulty: string;
}

export interface NonogramHint {
	row: number;
	col: number;
	filled: boolean;
	reason: string;
}
