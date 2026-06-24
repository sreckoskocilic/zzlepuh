export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export interface Card {
	rank: number;
	suit: Suit;
}

export type Phase =
	| { kind: 'playing' }
	| { kind: 'deal_complete' }
	| { kind: 'game_over'; loser: number };

export interface GameState {
	num_players: number;
	deck: Card[];
	table: Card[];
	hands: Card[][];
	piles: Card[][];
	scores: number[];
	deal_scores: number[];
	tablas: number[];
	current: number;
	dealer: number;
	last_capturer: number | null;
	deal_number: number;
	target: number;
	phase: Phase;
}

export interface ScoreBreakdown {
	most_cards: number;
	honors: number;
	two_of_clubs: number;
	tablas: number;
	total: number;
}

export interface Move {
	card: Card;
	captures: Card[][];
	played_value: number;
	is_tabla: boolean;
}

export interface MoveEvent {
	player: number;
	card: Card;
	captured: Card[];
	is_tabla: boolean;
	deal_complete: boolean;
	deal_breakdown: ScoreBreakdown[] | null;
}

export interface ApplyResult {
	state: GameState;
	events: MoveEvent[];
}

export const SUIT_SYMBOL: Record<Suit, string> = {
	hearts: '♥',
	diamonds: '♦',
	clubs: '♣',
	spades: '♠'
};

export function rankLabel(rank: number): string {
	switch (rank) {
		case 1:
			return 'A';
		case 11:
			return 'J';
		case 12:
			return 'Q';
		case 13:
			return 'K';
		default:
			return String(rank);
	}
}

export function cardKey(card: Card): string {
	return `${card.rank}-${card.suit}`;
}

const FACE_WORD: Record<number, string> = { 11: 'jack', 12: 'queen', 13: 'king' };

export function cardImage(card: Card): string {
	if (FACE_WORD[card.rank]) {
		return `/cards/${FACE_WORD[card.rank]}_of_${card.suit}2.png`;
	}
	const rank = card.rank === 1 ? 'ace' : String(card.rank);
	return `/cards/${rank}_of_${card.suit}.png`;
}

export function isRed(suit: Suit): boolean {
	return suit === 'hearts' || suit === 'diamonds';
}

function handOrder(rank: number): number {
	return rank === 1 ? 10.5 : rank;
}

export function sortHand(cards: Card[]): Card[] {
	return [...cards].sort((a, b) => handOrder(b.rank) - handOrder(a.rank));
}
