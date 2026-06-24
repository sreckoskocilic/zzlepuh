<script lang="ts">
	import type { GameState } from '$lib/types/kontab';
	import { kontabNames } from './names.svelte';

	interface Props {
		game: GameState;
		loser: number;
		onnew: () => void;
	}

	let { game, loser, onnew }: Props = $props();

	const humanLost = $derived(loser === 0);

	const label = (p: number) => kontabNames.label(p);
</script>

<div class="overlay" data-testid="kontab-game-over">
	<div class="panel" class:lost={humanLost}>
		<h2>{humanLost ? 'Izgubio si' : 'Pobjeda!'}</h2>
		<p class="sub" data-testid="kontab-result">
			{humanLost
				? 'Skupio si najviše bodova.'
				: `${label(loser)} izgubio s ${game.scores[loser]} bodova.`}
		</p>
		<div class="rows">
			{#each game.scores as score, p (p)}
				<div class="row" class:loser={p === loser}>
					<span>{label(p)}</span>
					<span class="val">{score}</span>
				</div>
			{/each}
		</div>
		<button type="button" class="primary" data-testid="kontab-play-again" onclick={onnew}>
			Igraj ponovno
		</button>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.65);
		z-index: 60;
	}

	.panel {
		background: var(--color-surface);
		border: 1px solid var(--color-accent);
		border-radius: 12px;
		padding: 1.6rem 2rem;
		text-align: center;
		min-width: 240px;
	}

	.panel.lost {
		border-color: #e06666;
	}

	h2 {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin-bottom: 0.4rem;
	}

	.sub {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin-bottom: 1rem;
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 1.2rem;
	}

	.row {
		display: flex;
		justify-content: space-between;
		gap: 1.5rem;
		font-size: 0.88rem;
		color: var(--color-text-primary);
		padding: 0.2rem 0.5rem;
		border-radius: 5px;
	}

	.row.loser {
		color: #e06666;
		font-weight: 700;
	}

	.val {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	.primary {
		background: #207959;
		color: #ffffff;
		border: none;
		border-radius: 6px;
		padding: 0.55rem 1.2rem;
		font-family: inherit;
		font-weight: 600;
		font-size: 0.88rem;
		cursor: pointer;
	}
</style>
