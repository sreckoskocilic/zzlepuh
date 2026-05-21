import { invoke } from '@tauri-apps/api/core';
import type { NonogramPuzzle, NonogramHint, CellState } from '$lib/types/nonogram';

export async function generateNonogramPuzzle(
	difficulty: string,
	rows?: number,
	cols?: number
): Promise<NonogramPuzzle> {
	return invoke<NonogramPuzzle>('generate_nonogram_puzzle', { difficulty, rows, cols });
}

export async function validateNonogramSolution(
	playerGrid: CellState[][],
	rowClues: number[][],
	colClues: number[][]
): Promise<boolean> {
	return invoke<boolean>('validate_nonogram_solution', { playerGrid, rowClues, colClues });
}

export async function getNonogramHint(
	playerGrid: CellState[][],
	rowClues: number[][],
	colClues: number[][]
): Promise<NonogramHint | null> {
	return invoke<NonogramHint | null>('get_nonogram_hint', { playerGrid, rowClues, colClues });
}

export async function checkNonogramErrors(
	playerGrid: CellState[][],
	rowClues: number[][],
	colClues: number[][]
): Promise<[number, number][]> {
	return invoke<[number, number][]>('check_nonogram_errors', { playerGrid, rowClues, colClues });
}
