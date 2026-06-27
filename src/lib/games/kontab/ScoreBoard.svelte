<script lang="ts">
	import type { GameState } from '$lib/types/kontab';
	import { kontabNames } from './names.svelte';

	interface Props {
		game: GameState;
	}

	let { game }: Props = $props();

	const label = (p: number) => kontabNames.label(p);

	const leader = $derived(
		game.phase.kind === 'game_over'
			? game.phase.loser
			: game.scores.reduce((worst, s, i, arr) => (s > arr[worst] ? i : worst), 0)
	);
</script>

<div class="board" data-testid="kontab-scoreboard">
	<table>
		<tbody>
			{#each game.scores as score, p (p)}
				<tr
					class:you={p === 0}
					class:danger={p === leader && score > 0}
					class:dealer={p === game.dealer}
					data-testid={`score-${p}`}
				>
					<td data-testid={p === game.dealer ? `dealer-${p}` : undefined} title={p === game.dealer ? 'Dealer' : undefined}>{label(p)}</td>
					<td class="num">{score}</td>
					<td class="num cards" title="Cards captured this deal">{game.piles[p].length}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.board {
		border: 1px solid rgba(255, 255, 255, 0.22);
		border-radius: 10px;
		overflow: hidden;
		background: var(--color-surface);
		min-width: 144px;
	}

	table {
		border-collapse: collapse;
		width: 100%;
		font-size: clamp(0.95rem, 1.9vmin, 1.25rem);
	}

	td {
		padding: 0.5rem 0.9rem;
		text-align: left;
		color: var(--color-text-primary);
		border: 1px solid rgba(255, 255, 255, 0.22);
	}

	.num {
		text-align: right;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.cards {
		color: #6fb0e8;
	}

	tbody tr.dealer td {
		background: #1c341c;
	}

	tbody tr.you td {
		font-weight: 700;
	}

	/* leader highlighted gold (positive), not red */
	tbody tr.danger td {
		color: #e6c469;
		font-weight: 700;
	}
</style>
