import type { Difficulty, GameStats } from '$lib/types/game';
import { emptyGameStats } from '$lib/types/game';
import { getData, setData } from '$lib/services/persistence';

class StatsStore {
	stats = $state<Record<string, GameStats>>({});
	loaded = $state(false);

	async load(gameId: string): Promise<GameStats> {
		if (this.stats[gameId]) return this.stats[gameId];

		const saved = await getData<GameStats>(`stats:${gameId}`);
		const s = saved ?? emptyGameStats();
		this.stats[gameId] = s;
		this.loaded = true;
		return s;
	}

	async recordWin(gameId: string, difficulty: Difficulty, timeMs: number, _hintsUsed: number): Promise<void> {
		const s = await this.load(gameId);
		s.gamesPlayed++;
		s.gamesWon++;
		s.currentStreak++;
		if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
		s.lastPlayedAt = new Date().toISOString();

		if (s.bestTimeMs[difficulty] === null || timeMs < s.bestTimeMs[difficulty]!) {
			s.bestTimeMs[difficulty] = timeMs;
		}

		const d = s.byDifficulty[difficulty];
		d.played++;
		d.won++;
		d.totalTimeMs += timeMs;
		if (d.bestTimeMs === null || timeMs < d.bestTimeMs) {
			d.bestTimeMs = timeMs;
		}

		this.stats[gameId] = structuredClone(s);
		await setData(`stats:${gameId}`, s);
	}

	async recordLoss(gameId: string, difficulty: Difficulty): Promise<void> {
		const s = await this.load(gameId);
		s.gamesPlayed++;
		s.currentStreak = 0;
		s.lastPlayedAt = new Date().toISOString();

		s.byDifficulty[difficulty].played++;

		this.stats[gameId] = structuredClone(s);
		await setData(`stats:${gameId}`, s);
	}

	getStats(gameId: string): GameStats {
		return this.stats[gameId] ?? emptyGameStats();
	}
}

export const statsStore = new StatsStore();
