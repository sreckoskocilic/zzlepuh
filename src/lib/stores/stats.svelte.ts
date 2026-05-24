import type { Difficulty, GameStats } from '$lib/types/game';
import { emptyGameStats } from '$lib/types/game';
import { getData, setData } from '$lib/services/persistence';

class StatsStore {
	stats = $state<Record<string, GameStats>>({});
	private pending = new Map<string, Promise<GameStats>>();

	async load(gameId: string): Promise<GameStats> {
		if (this.stats[gameId]) return this.stats[gameId];
		if (!this.pending.has(gameId)) {
			this.pending.set(gameId, getData<GameStats>(`stats:${gameId}`).then(saved => {
				const s = saved ?? emptyGameStats();
				this.stats[gameId] = s;
				this.pending.delete(gameId);
				return s;
			}));
		}
		return this.pending.get(gameId)!;
	}

	async recordWin(gameId: string, difficulty: Difficulty, timeMs: number, _hintsUsed: number): Promise<void> {
		const s = structuredClone(await this.load(gameId));
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

		this.stats[gameId] = s;
		await setData(`stats:${gameId}`, s);
	}

	async recordLoss(gameId: string): Promise<void> {
		const s = structuredClone(await this.load(gameId));
		s.gamesPlayed++;
		s.currentStreak = 0;
		s.lastPlayedAt = new Date().toISOString();

		this.stats[gameId] = s;
		await setData(`stats:${gameId}`, s);
	}

	getStats(gameId: string): GameStats {
		return this.stats[gameId] ?? emptyGameStats();
	}
}

export const statsStore = new StatsStore();
