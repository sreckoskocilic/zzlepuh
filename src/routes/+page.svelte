<script lang="ts">
	import type { GameInfo } from '$lib/types/game';

	const games: GameInfo[] = [
		{
			id: 'bimaru',
			name: 'Bimaru',
			description: 'Battleship solitaire — place ships using row and column clues',
			route: '/bimaru'
		}
	];
</script>

<div class="home">
	<div class="header">
		<h1>Zzlepuh</h1>
		<p class="subtitle">Puzzle games</p>
	</div>

	<div class="game-grid">
		{#each games as game (game.id)}
			<a href={game.route} class="game-card">
				<div class="card-icon">
					<svg width="32" height="32" viewBox="0 0 32 32">
						<circle cx="16" cy="8" r="4" fill="var(--color-accent)" />
						<rect x="4" y="16" width="8" height="4" rx="2" fill="var(--color-accent)" />
						<rect x="20" y="20" width="8" height="4" rx="2" fill="var(--color-accent)" />
						<rect x="8" y="26" width="12" height="4" rx="2" fill="var(--color-accent)" />
					</svg>
				</div>
				<h3>{game.name}</h3>
				<p>{game.description}</p>
			</a>
		{/each}

		<div class="game-card coming-soon">
			<div class="card-icon">
				<svg width="32" height="32" viewBox="0 0 32 32">
					<rect x="6" y="6" width="20" height="20" rx="3" fill="none" stroke="var(--color-text-clue)" stroke-width="1.5" stroke-dasharray="3 3" />
					<text x="16" y="20" text-anchor="middle" fill="var(--color-text-clue)" font-size="14">?</text>
				</svg>
			</div>
			<h3>More coming</h3>
			<p>Kakuro, Nonograms, and more puzzle games</p>
		</div>
	</div>
</div>

<style>
	.home {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 3rem 1.5rem;
	}

	.header {
		text-align: center;
		margin-bottom: 2.5rem;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-accent);
		margin-bottom: 0.3rem;
	}

	.subtitle {
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	.game-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 1rem;
		max-width: 600px;
		width: 100%;
	}

	.game-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border-cell);
		border-radius: 10px;
		padding: 1.5rem;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s, background 0.15s;
	}

	.game-card:hover {
		border-color: var(--color-accent-dim);
		background: var(--color-surface-hover);
	}

	.game-card.coming-soon {
		opacity: 0.4;
		cursor: default;
		pointer-events: none;
	}

	.card-icon {
		margin-bottom: 0.8rem;
	}

	h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 0.3rem;
	}

	.game-card p {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		line-height: 1.4;
	}
</style>
