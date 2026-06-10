import { describe, it, expect } from 'vitest';
import { emptyGameStats, mergeGameStats } from './game';

describe('mergeGameStats', () => {
	it('returns a full empty shape for null / non-object input', () => {
		expect(mergeGameStats(null)).toEqual(emptyGameStats());
		expect(mergeGameStats(undefined)).toEqual(emptyGameStats());
		expect(mergeGameStats(42)).toEqual(emptyGameStats());
		expect(mergeGameStats('nope')).toEqual(emptyGameStats());
	});

	it('backfills missing top-level keys from the empty shape', () => {
		// An old save with only a couple of fields set.
		const merged = mergeGameStats({ gamesPlayed: 5 });
		expect(merged.gamesPlayed).toBe(5);
		expect(merged.gamesWon).toBe(0);
		expect(merged.currentStreak).toBe(0);
		expect(merged.bestStreak).toBe(0);
		expect(merged.lastPlayedAt).toBeNull();
	});

	it('backfills a difficulty missing from bestTimeMs (the new-difficulty case)', () => {
		// Save predates the `hard` difficulty: bestTimeMs has no `hard` key.
		const merged = mergeGameStats({ bestTimeMs: { easy: 1000, medium: 2000 } });
		expect(merged.bestTimeMs.easy).toBe(1000);
		expect(merged.bestTimeMs.medium).toBe(2000);
		expect(merged.bestTimeMs.hard).toBeNull();
	});

	it('backfills byDifficulty entries and missing sub-fields', () => {
		// `byDifficulty.easy` exists but predates `totalTimeMs`; medium/hard absent.
		const merged = mergeGameStats({
			byDifficulty: { easy: { played: 5, won: 3, bestTimeMs: 900 } }
		});
		expect(merged.byDifficulty.easy).toEqual({
			played: 5,
			won: 3,
			bestTimeMs: 900,
			totalTimeMs: 0 // backfilled
		});
		expect(merged.byDifficulty.medium).toEqual({
			played: 0,
			won: 0,
			bestTimeMs: null,
			totalTimeMs: 0
		});
		expect(merged.byDifficulty.hard).toEqual({
			played: 0,
			won: 0,
			bestTimeMs: null,
			totalTimeMs: 0
		});
	});

	it('preserves a fully-populated current-version save unchanged', () => {
		const full = emptyGameStats();
		full.gamesPlayed = 10;
		full.gamesWon = 7;
		full.bestTimeMs.medium = 1234;
		full.byDifficulty.medium = { played: 8, won: 7, bestTimeMs: 1234, totalTimeMs: 9999 };
		expect(mergeGameStats(full)).toEqual(full);
	});

	it('does not mutate the empty-shape singleton between calls', () => {
		const a = mergeGameStats({ byDifficulty: { easy: { played: 1, won: 1 } } });
		const b = mergeGameStats(null);
		// b must be pristine — a's partial easy data must not leak into b.
		expect(b.byDifficulty.easy.played).toBe(0);
		expect(a.byDifficulty.easy.played).toBe(1);
	});
});
