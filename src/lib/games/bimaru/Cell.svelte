<script lang="ts">
	import type { CellValue, ShipVisual } from '$lib/types/bimaru';
	import { inferShipVisual } from './logic';

	let {
		value,
		grid,
		row,
		col,
		rows,
		cols,
		isHint = false,
		isError = false,
		onclick
	}: {
		value: CellValue;
		grid: CellValue[][];
		row: number;
		col: number;
		rows: number;
		cols: number;
		isHint?: boolean;
		isError?: boolean;
		onclick: () => void;
	} = $props();

	let visual = $derived(inferShipVisual(grid, row, col, rows, cols));

	const shipRadii: Record<ShipVisual, string> = {
		none: '',
		water: '',
		single: '9999px',
		top: '9999px 9999px 3px 3px',
		bottom: '3px 3px 9999px 9999px',
		left: '9999px 3px 3px 9999px',
		right: '3px 9999px 9999px 3px',
		middle_h: '3px',
		middle_v: '3px'
	};
</script>

<button
	class="cell"
	class:water={value === 'water'}
	class:ship={value === 'ship'}
	class:empty={value === 'empty'}
	class:hint={isHint}
	class:error={isError}
	disabled={isHint}
	data-testid="cell-{row}-{col}"
	onclick={onclick}
>
	{#if value === 'water'}
		<span class="water-dot"></span>
	{:else if value === 'ship'}
		<span class="ship-shape" style:border-radius={shipRadii[visual]}></span>
	{/if}
</button>

<style>
	.cell {
		width: var(--cell-size, 36px);
		height: var(--cell-size, 36px);
		border: 1px solid var(--color-border-cell);
		border-radius: 5px;
		background: var(--color-bg-cell-empty);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.1s;
		position: relative;
		padding: 0;
		margin: 1.5px;
	}

	.cell:hover:not(:disabled) {
		background: var(--color-surface-hover);
	}

	.cell:disabled {
		cursor: default;
	}

	.cell.water {
		background: var(--color-bg-cell-water);
	}

	.cell.ship {
		background: var(--color-bg-cell);
	}

	.cell.hint {
		background: var(--color-hint-bg);
		border-color: var(--color-hint-border);
	}

	.cell.hint.ship {
		background: var(--color-hint-bg);
	}

	.cell.error {
		border-color: #f43f5e;
		box-shadow: 0 0 6px rgba(244, 63, 94, 0.4);
		animation: error-flash 0.3s ease-in-out;
	}

	@keyframes error-flash {
		0% { transform: scale(1); }
		50% { transform: scale(1.08); }
		100% { transform: scale(1); }
	}

	.water-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #4a7a72;
	}

	.ship-shape {
		width: calc(var(--cell-size, 36px) - 10px);
		height: calc(var(--cell-size, 36px) - 10px);
		background: var(--color-accent);
		border-radius: 3px;
		position: absolute;
	}

	.hint .ship-shape {
		background: var(--color-accent-light);
		opacity: 0.7;
	}
</style>
