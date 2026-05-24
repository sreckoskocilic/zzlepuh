export type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'none';

export interface Cage {
	cells: [number, number][];
	operation: Operation;
	target: number;
}

export interface CalcudokuPuzzle {
	size: number;
	cages: Cage[];
	difficulty: string;
}

export interface CalcudokuHint {
	row: number;
	col: number;
	value: number;
	reason: string;
}
