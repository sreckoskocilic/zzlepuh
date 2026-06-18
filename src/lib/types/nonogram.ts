export type CellState = 'empty' | 'filled' | 'marked';

export interface NonogramPuzzle {
	rows: number;
	cols: number;
	row_clues: number[][];
	col_clues: number[][];
	difficulty: string;
	/** Picture title — only present on a completed picture (the reveal). */
	title?: string;
}

/** Anonymous picker entry — no title so the image stays a surprise. */
export interface PictureMeta {
	id: string;
	rows: number;
	cols: number;
}

export interface NonogramHint {
	row: number;
	col: number;
	filled: boolean;
	reason: string;
}
