import { invoke } from '@tauri-apps/api/core';
import type { CalcudokuPuzzle, CalcudokuHint } from '$lib/types/calcudoku';

export async function generateCalcudokuPuzzle(
	difficulty: string,
	size?: number
): Promise<CalcudokuPuzzle> {
	return invoke<CalcudokuPuzzle>('generate_calcudoku_puzzle', { difficulty, size });
}

export async function validateCalcudokuSolution(
	playerGrid: number[][],
	puzzle: CalcudokuPuzzle
): Promise<boolean> {
	return invoke<boolean>('validate_calcudoku_solution', { playerGrid, puzzle });
}

export async function getCalcudokuHint(
	playerGrid: number[][],
	puzzle: CalcudokuPuzzle
): Promise<CalcudokuHint | null> {
	return invoke<CalcudokuHint | null>('get_calcudoku_hint', { playerGrid, puzzle });
}

export async function checkCalcudokuErrors(
	playerGrid: number[][],
	puzzle: CalcudokuPuzzle
): Promise<[number, number][]> {
	return invoke<[number, number][]>('check_calcudoku_errors', { playerGrid, puzzle });
}
