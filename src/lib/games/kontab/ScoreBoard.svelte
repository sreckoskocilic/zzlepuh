<script lang="ts">
	import type { GameState } from '$lib/types/kontab';
	import { kontabNames } from './names.svelte';

	interface Props {
		game: GameState;
	}

	let { game }: Props = $props();

	const label = (p: number) => kontabNames.label(p);

	const leader = $derived(
		game.scores.reduce((worst, s, i, arr) => (s > arr[worst] ? i : worst), 0)
	);
</script>

<div class="board" data-testid="kontab-scoreboard">
	<table>
		<tbody>
			{#each game.scores as score, p (p)}
				<tr class:you={p === 0} class:danger={p === leader && score > 0} data-testid={`score-${p}`}>
					<td class="deal-cell">
						{#if p === game.dealer}
							<span class="dealer-card" title="Dijeli" data-testid={`dealer-${p}`}></span>
						{/if}
					</td>
					<td>{label(p)}</td>
					<td class="num">{score}</td>
					<td class="num cards" title="Odnesene karte u ovom dijeljenju">{game.piles[p].length}</td>
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
		font-size: 1rem;
	}

	td {
		padding: 0.44rem 0.8rem;
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

	.deal-cell {
		width: 28px;
		padding: 0 0.24rem 0 0.56rem;
		text-align: center;
		vertical-align: middle;
	}

	.dealer-card {
		display: inline-block;
		vertical-align: middle;
		width: 13px;
		height: 18px;
		border-radius: 3px;
		border: 1.5px solid #f3f2ec;
		background:
			repeating-linear-gradient(
				45deg,
				rgba(255, 255, 255, 0.14),
				rgba(255, 255, 255, 0.14) 2px,
				transparent 2px,
				transparent 5px
			),
			linear-gradient(135deg, #2f5aa8, #1d3a73);
	}

	tbody tr.you td {
		font-weight: 700;
	}

	tbody tr.danger td {
		color: #e06666;
	}
</style>
