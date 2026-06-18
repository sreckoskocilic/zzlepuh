<script lang="ts">
	let {
		hintsUsed = 0,
		elapsedMs = 0,
		leaderboardRank = null,
		onNewGame
	}: {
		hintsUsed?: number;
		elapsedMs?: number;
		leaderboardRank?: number | null;
		onNewGame: () => void;
	} = $props();

	let timeStr = $derived(() => {
		const secs = Math.floor(elapsedMs / 1000);
		const mins = Math.floor(secs / 60);
		return `${String(mins).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
	});
</script>

<div class="overlay" data-testid="win-overlay">
	<div class="card">
		<h2>Puzzle Complete!</h2>
		<div class="stats">
			<div class="stat">
				<span class="label">Time</span>
				<span class="value">{timeStr()}</span>
			</div>
			<div class="stat">
				<span class="label">Hints</span>
				<span class="value">{hintsUsed}</span>
			</div>
		</div>
		{#if leaderboardRank !== null}
			<p class="rank-msg">#{leaderboardRank + 1} on the leaderboard!</p>
		{/if}
		<button class="btn-play" data-testid="btn-play-again" onclick={onNewGame}>Play Again</button>
	</div>
</div>

<style>
	.overlay {
		position: absolute;
		inset: 0;
		background: var(--color-overlay-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
		backdrop-filter: blur(4px);
	}

	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border-cell);
		border-radius: 12px;
		padding: 2rem 2.5rem;
		text-align: center;
	}

	h2 {
		color: var(--color-accent);
		font-size: 1.55rem;
		margin-bottom: 1rem;
	}

	.stats {
		display: flex;
		gap: 2rem;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.label {
		font-size: 1rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.value {
		font-size: 1.35rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.rank-msg {
		color: var(--color-accent);
		font-size: 0.95rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}

	.btn-play {
		background: var(--color-accent);
		color: var(--color-bg-primary);
		border: none;
		border-radius: 6px;
		padding: 0.5rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
	}

	.btn-play:hover {
		opacity: 0.9;
	}
</style>
