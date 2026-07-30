export type Difficulty = 'easy' | 'medium' | 'hard';

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

export interface LeaderboardEntry {
	timeMs: number;
	hintsUsed: number;
	date: string;
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

// Stats saved by an older version can be missing keys this one expects (say a new
// difficulty), and reading those would crash. Fill any gaps from the empty shape.
function num(v: unknown, fallback: number): number {
	return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function nullableNum(v: unknown): number | null {
	return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function mergeGameStats(saved: unknown): GameStats {
	const base = emptyGameStats();
	if (!saved || typeof saved !== 'object') return base;
	const s = saved as Partial<GameStats>;
	const merged: GameStats = { ...base, ...s };
	merged.gamesPlayed = num(s.gamesPlayed, 0);
	merged.gamesWon = num(s.gamesWon, 0);
	merged.currentStreak = num(s.currentStreak, 0);
	merged.bestStreak = num(s.bestStreak, 0);
	merged.bestTimeMs = { ...base.bestTimeMs };
	for (const k of Object.keys(base.bestTimeMs) as Difficulty[]) {
		merged.bestTimeMs[k] = nullableNum(s.bestTimeMs?.[k]);
	}
	merged.byDifficulty = {} as GameStats['byDifficulty'];
	for (const k of Object.keys(base.byDifficulty) as Difficulty[]) {
		const d = s.byDifficulty?.[k];
		merged.byDifficulty[k] = {
			played: num(d?.played, 0),
			won: num(d?.won, 0),
			bestTimeMs: nullableNum(d?.bestTimeMs),
			totalTimeMs: num(d?.totalTimeMs, 0)
		};
	}
	return merged;
}
