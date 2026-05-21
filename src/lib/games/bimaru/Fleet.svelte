<script lang="ts">
	import type { CellValue } from '$lib/types/bimaru';
	import type { BimaruPuzzle } from '$lib/types/bimaru';
	import { countRemainingShips } from './logic';

	let {
		puzzle,
		grid
	}: {
		puzzle: BimaruPuzzle;
		grid: CellValue[][];
	} = $props();

	let remaining = $derived(
		countRemainingShips(grid, puzzle.fleet, puzzle.rows, puzzle.cols)
	);
</script>

<div class="fleet-panel">
	<h4>Fleet</h4>
	{#each puzzle.fleet.ships as spec (spec.length)}
		{@const left = remaining.get(spec.length) ?? 0}
		<div class="fleet-ship" class:placed={left === 0}>
			<div class="fleet-dots">
				{#each Array(spec.length) as _, i (i)}
					<span
						class="fleet-dot"
						class:first={i === 0}
						class:last={i === spec.length - 1}
						class:only={spec.length === 1}
					></span>
				{/each}
			</div>
			<span class="fleet-count">×{left}</span>
		</div>
	{/each}
</div>

<style>
	.fleet-panel {
		min-width: 110px;
	}

	h4 {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 600;
		color: var(--color-text-clue);
		margin-bottom: 0.6rem;
	}

	.fleet-ship {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		transition: opacity 0.2s;
	}

	.fleet-ship.placed {
		opacity: 0.3;
	}

	.fleet-dots {
		display: flex;
		gap: 1px;
	}

	.fleet-dot {
		width: 12px;
		height: 12px;
		background: var(--color-accent);
		border-radius: 3px;
	}

	.fleet-dot.first {
		border-radius: 9999px 3px 3px 9999px;
	}

	.fleet-dot.last {
		border-radius: 3px 9999px 9999px 3px;
	}

	.fleet-dot.only {
		border-radius: 9999px;
	}

	.fleet-count {
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}
</style>
