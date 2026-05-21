export type CellValue = 'empty' | 'water' | 'ship';

export type HintCell = 'empty' | 'water' | 'ship';

export type ShipVisual =
	| 'none'
	| 'water'
	| 'single'
	| 'top'
	| 'bottom'
	| 'left'
	| 'right'
	| 'middle_h'
	| 'middle_v';

export interface ShipSpec {
	length: number;
	count: number;
}

export interface Fleet {
	ships: ShipSpec[];
}

export interface BimaruPuzzle {
	rows: number;
	cols: number;
	row_clues: number[];
	col_clues: number[];
	hints: HintCell[][];
	fleet: Fleet;
	difficulty: string;
}

export interface BimaruHint {
	row: number;
	col: number;
	value: CellValue;
	reason: string;
}
