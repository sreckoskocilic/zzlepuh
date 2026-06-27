<script lang="ts">
	import type { GameState, ScoreBreakdown } from '$lib/types/kontab';
	import { kontabNames } from './names.svelte';

	interface Props {
		game: GameState;
		breakdown: ScoreBreakdown[] | null;
		oncontinue: () => void;
	}

	let { game, breakdown, oncontinue }: Props = $props();

	const label = (p: number) => kontabNames.label(p);
</script>

<div class="overlay" data-testid="kontab-deal-summary">
	<div class="panel">
		<h2>End of deal {game.deal_number}</h2>
		<table>
			<thead>
				<tr>
					<th>Player</th>
					<th title="Most cards">Cards</th>
					<th title="A K Q J 10 (10♦ = 2)">Honors</th>
					<th>2♣</th>
					<th>Sweep</th>
					<th>This deal</th>
					<th>Total</th>
				</tr>
			</thead>
			<tbody>
				{#each game.scores as total, p (p)}
					{@const b = breakdown?.[p]}
					<tr class:you={p === 0}>
						<td>{label(p)}</td>
						<td>{b?.most_cards ?? 0}</td>
						<td>{b?.honors ?? 0}</td>
						<td>{b?.two_of_clubs ?? 0}</td>
						<td>{b?.tablas ?? 0}</td>
						<td class="strong">{game.deal_scores[p]}</td>
						<td class="strong">{total}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<button type="button" class="primary" data-testid="kontab-continue" onclick={oncontinue}>
			Next deal
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
		background: rgba(0, 0, 0, 0.6);
		z-index: 60;
	}

	.panel {
		background: var(--color-surface);
		border: 1px solid var(--color-border-cell);
		border-radius: 12px;
		padding: 1.4rem;
		max-width: 90vw;
	}

	h2 {
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 1rem;
	}

	table {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.82rem;
		margin-bottom: 1.2rem;
	}

	th,
	td {
		padding: 0.35rem 0.6rem;
		text-align: center;
		color: #c5c8c5;
	}

	th {
		font-weight: 600;
		border-bottom: 1px solid var(--color-border-cell);
	}

	td {
		color: var(--color-text-primary);
	}

	tr.you td {
		color: var(--color-accent);
		font-weight: 600;
	}

	.strong {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.primary {
		background: #207959;
		color: #e9e1e1;
		border: none;
		border-radius: 6px;
		padding: 0.55rem 1.1rem;
		font-family: inherit;
		font-weight: 600;
		font-size: 0.88rem;
		cursor: pointer;
		display: block;
		margin: 0 auto;
	}
</style>
