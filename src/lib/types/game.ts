export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GridSize {
	rows: number;
	cols: number;
}

export interface GameInfo {
	id: string;
	name: string;
	description: string;
	route: string;
}

export interface GameStats {
	gamesPlayed: number;
	gamesWon: number;
	bestTimeMs: Record<Difficulty, number | null>;
	currentStreak: number;
	bestStreak: number;
	lastPlayedAt: string | null;
	byDifficulty: Record<
		Difficulty,
		{
			played: number;
			won: number;
			bestTimeMs: number | null;
			totalTimeMs: number;
		}
	>;
}

export function emptyGameStats(): GameStats {
	const emptyDiff = () => ({ played: 0, won: 0, bestTimeMs: null, totalTimeMs: 0 });
	return {
		gamesPlayed: 0,
		gamesWon: 0,
		bestTimeMs: { easy: null, medium: null, hard: null },
		currentStreak: 0,
		bestStreak: 0,
		lastPlayedAt: null,
		byDifficulty: {
			easy: emptyDiff(),
			medium: emptyDiff(),
			hard: emptyDiff()
		}
	};
}
