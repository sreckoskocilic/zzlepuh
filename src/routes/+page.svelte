<script lang="ts">
	import type { GameInfo } from '$lib/types/game';

	const games: GameInfo[] = [
		{
			id: 'bimaru',
			name: 'Bimaru',
			description: 'Battleship solitaire — place ships using row and column clues',
			route: '/bimaru'
		},
		{
			id: 'nonogram',
			name: 'Nonogram',
			description: 'Paint by numbers — fill cells to reveal a hidden picture',
			route: '/nonogram'
		},
		{
			id: 'calcudoku',
			name: 'Calcudoku',
			description: 'Math puzzle — fill the grid so each row and column has unique numbers matching cage operations',
			route: '/calcudoku'
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
					{#if game.id === 'bimaru'}
						<svg width="32" height="32" viewBox="0 0 32 32">
							<circle cx="16" cy="8" r="4" fill="var(--color-accent)" />
							<rect x="4" y="16" width="8" height="4" rx="2" fill="var(--color-accent)" />
							<rect x="20" y="20" width="8" height="4" rx="2" fill="var(--color-accent)" />
							<rect x="8" y="26" width="12" height="4" rx="2" fill="var(--color-accent)" />
						</svg>
					{:else if game.id === 'nonogram'}
						<svg width="32" height="32" viewBox="0 0 32 32">
							<rect x="4" y="4" width="7" height="7" rx="1" fill="var(--color-accent)" />
							<rect x="12.5" y="4" width="7" height="7" rx="1" fill="var(--color-accent)" opacity="0.25" />
							<rect x="21" y="4" width="7" height="7" rx="1" fill="var(--color-accent)" />
							<rect x="4" y="12.5" width="7" height="7" rx="1" fill="var(--color-accent)" opacity="0.25" />
							<rect x="12.5" y="12.5" width="7" height="7" rx="1" fill="var(--color-accent)" />
							<rect x="21" y="12.5" width="7" height="7" rx="1" fill="var(--color-accent)" opacity="0.25" />
							<rect x="4" y="21" width="7" height="7" rx="1" fill="var(--color-accent)" />
							<rect x="12.5" y="21" width="7" height="7" rx="1" fill="var(--color-accent)" opacity="0.25" />
							<rect x="21" y="21" width="7" height="7" rx="1" fill="var(--color-accent)" />
						</svg>
					{:else if game.id === 'calcudoku'}
						<svg width="32" height="32" viewBox="0 0 32 32">
							<rect x="3" y="3" width="26" height="26" rx="2" stroke="var(--color-accent)" stroke-width="2" fill="none"/>
							<line x1="3" y1="16" x2="29" y2="16" stroke="var(--color-accent)" stroke-width="2"/>
							<line x1="16" y1="3" x2="16" y2="29" stroke="var(--color-accent)" stroke-width="2"/>
							<path d="M8 9.5h4M10 7.5v4" stroke="var(--color-accent)" stroke-width="1.8" stroke-linecap="round"/>
							<path d="M21 9.5h4" stroke="var(--color-accent)" stroke-width="1.8" stroke-linecap="round"/>
							<path d="M8 24l4-4M8 20l4 4" stroke="var(--color-accent)" stroke-width="1.8" stroke-linecap="round"/>
							<circle cx="23" cy="20.5" r="0.9" fill="var(--color-accent)"/>
							<path d="M21 22.5h4" stroke="var(--color-accent)" stroke-width="1.8" stroke-linecap="round"/>
							<circle cx="23" cy="24.5" r="0.9" fill="var(--color-accent)"/>
						</svg>
					{/if}
				</div>
				<h3>{game.name}</h3>
				<p>{game.description}</p>
			</a>
		{/each}
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
