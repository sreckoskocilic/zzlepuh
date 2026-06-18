import { invoke } from '@tauri-apps/api/core';
import type { BimaruPuzzle, BimaruHint, CellValue, Fleet, HintCell } from '$lib/types/bimaru';

export async function generatePuzzle(
	difficulty: string,
	rows?: number,
	cols?: number
): Promise<BimaruPuzzle> {
	return invoke<BimaruPuzzle>('generate_bimaru_puzzle', { difficulty, rows, cols });
}

export async function validateSolution(
	playerGrid: CellValue[][],
	rowClues: number[],
	colClues: number[],
	fleet: Fleet
): Promise<boolean> {
	return invoke<boolean>('validate_bimaru_solution', {
		playerGrid,
		rowClues,
		colClues,
		fleet
	});
}

export async function checkErrors(
	playerGrid: CellValue[][],
	rowClues: number[],
	colClues: number[],
	fleet: Fleet,
	hints: HintCell[][]
): Promise<[number, number][]> {
	return invoke<[number, number][]>('check_bimaru_errors', {
		playerGrid,
		rowClues,
		colClues,
		fleet,
		hints
	});
}

export async function getHint(
	playerGrid: CellValue[][],
	rowClues: number[],
	colClues: number[],
	fleet: Fleet,
	hints: HintCell[][]
): Promise<BimaruHint | null> {
	return invoke<BimaruHint | null>('get_bimaru_hint', {
		playerGrid,
		rowClues,
		colClues,
		fleet,
		hints
	});
}
