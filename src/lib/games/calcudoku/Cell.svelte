<script lang="ts">
	let {
		value,
		label,
		notes = [],
		puzzleSize = 6,
		cellSize = 48,
		row,
		col,
		isSelected = false,
		isError = false,
		onclick
	}: {
		value: number;
		label: string;
		notes?: number[];
		puzzleSize?: number;
		cellSize?: number;
		row: number;
		col: number;
		isSelected?: boolean;
		isError?: boolean;
		onclick: () => void;
	} = $props();

	let labelFontPx = $derived(Math.max(8, Math.round(cellSize * 0.20)));
	let numFontPx = $derived(Math.max(14, Math.round(cellSize * 0.45)));
	let noteFontPx = $derived(Math.max(7, Math.round(cellSize * 0.2)));
</script>

<button
	class="cell"
	class:selected={isSelected}
	class:error={isError}
	class:has-value={value > 0}
	data-testid="cell-{row}-{col}"
	{onclick}
>
	{#if label}
		<span class="cage-label" style:font-size="{labelFontPx}px">{label}</span>
	{/if}
	{#if value > 0}
		<span class="number" style:font-size="{numFontPx}px">{value}</span>
	{:else if notes.length > 0}
		<span class="notes-inline" style:font-size="{noteFontPx}px">
			{notes.toSorted((a, b) => a - b).join(' ')}
		</span>
	{/if}
</button>

<style>
	.cell {
		width: 100%;
		height: 100%;
		border: none;
		border-radius: 0;
		background: var(--cell-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 0.1s;
		padding: 0;
		margin: 0;
		position: relative;
	}

	.cell:hover {
		background: var(--cell-hover);
	}

	.cell.selected {
		background: var(--cell-selected);
	}

	.cell.error {
		box-shadow: inset 0 0 0 2px #d43050;
		animation: error-flash 0.3s ease-in-out;
	}

	@keyframes error-flash {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.05);
		}
		100% {
			transform: scale(1);
		}
	}

	.cage-label {
		position: absolute;
		top: 1px;
		left: 2px;
		font-weight: 550;
		line-height: 1;
		color: #C0432E;
		pointer-events: none;
		z-index: 1;
	}

	.number {
		font-weight: 500;
		line-height: 1;
		color: #50624D;
	}

	.notes-inline {
		position: absolute;
		right: 3px;
		bottom: 2px;
		font-weight: 500;
		line-height: 1;
		color: #4C4DA4;
		pointer-events: none;
		white-space: nowrap;
		letter-spacing: 0.5px;
	}
</style>
