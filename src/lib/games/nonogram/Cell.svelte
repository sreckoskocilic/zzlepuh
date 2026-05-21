<script lang="ts">
	import type { CellState } from '$lib/types/nonogram';

	let {
		value,
		row,
		col,
		isError = false,
		onclick,
		onrightclick
	}: {
		value: CellState;
		row: number;
		col: number;
		isError?: boolean;
		onclick: () => void;
		onrightclick?: () => void;
	} = $props();
</script>

<button
	class="cell"
	class:filled={value === 'filled'}
	class:marked={value === 'marked'}
	class:error={isError}
	data-testid="cell-{row}-{col}"
	onclick={onclick}
	oncontextmenu={(e) => { e.preventDefault(); onrightclick?.(); }}
>
	{#if value === 'marked'}
		<svg class="x-mark" viewBox="0 0 12 12" fill="none">
			<path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
		</svg>
	{:else if value === 'filled'}
		<span class="fill-block"></span>
	{/if}
</button>

<style>
	.cell {
		width: var(--cell-size, 28px);
		height: var(--cell-size, 28px);
		border: 1px solid var(--color-border-cell);
		border-radius: 3px;
		background: var(--color-bg-cell-empty);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.1s;
		position: relative;
		padding: 0;
		margin: 1px;
	}

	.cell:hover {
		background: var(--color-surface-hover);
	}

	.cell.filled {
		background: var(--color-bg-cell);
	}

	.cell.marked {
		background: var(--color-bg-cell-water);
	}

	.cell.error {
		border-color: var(--color-error);
		box-shadow: 0 0 6px var(--color-error-glow);
		animation: error-flash 0.3s ease-in-out;
	}

	@keyframes error-flash {
		0% { transform: scale(1); }
		50% { transform: scale(1.08); }
		100% { transform: scale(1); }
	}

	.fill-block {
		width: calc(var(--cell-size, 28px) - 8px);
		height: calc(var(--cell-size, 28px) - 8px);
		background: var(--color-accent);
		border-radius: 2px;
	}

	.x-mark {
		width: 55%;
		height: 55%;
		color: var(--color-water-dot);
	}
</style>
