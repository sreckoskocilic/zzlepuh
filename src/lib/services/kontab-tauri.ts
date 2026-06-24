import { invoke } from '@tauri-apps/api/core';
import type { ApplyResult, Card, GameState, Move } from '$lib/types/kontab';

export async function startKontabGame(
	numPlayers: number,
	target: number,
	seed?: number
): Promise<GameState> {
	return invoke<GameState>('start_kontab_game', { numPlayers, target, seed });
}

export async function kontabLegalMoves(state: GameState): Promise<Move[]> {
	return invoke<Move[]>('kontab_legal_moves', { state });
}

export async function kontabApplyMove(state: GameState, card: Card): Promise<ApplyResult> {
	return invoke<ApplyResult>('kontab_apply_move', { state, card });
}

export async function kontabAiMove(state: GameState): Promise<Move> {
	return invoke<Move>('kontab_ai_move', { state });
}

export async function kontabNextDeal(state: GameState, seed?: number): Promise<GameState> {
	return invoke<GameState>('kontab_next_deal', { state, seed });
}
