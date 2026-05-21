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
			<path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
		</svg>
	{:else if value === 'filled'}
		<span class="fill-block"></span>
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
	}

	.cell:hover {
		background: var(--cell-hover);
	}

	.cell.error {
		box-shadow: inset 0 0 0 2px #d43050;
		animation: error-flash 0.3s ease-in-out;
	}

	@keyframes error-flash {
		0% { transform: scale(1); }
		50% { transform: scale(1.05); }
		100% { transform: scale(1); }
	}

	.fill-block {
		width: calc(100% - 4px);
		height: calc(100% - 4px);
		background: var(--cell-fill);
		border-radius: 2px;
	}

	.x-mark {
		width: 60%;
		height: 60%;
		color: var(--cell-x);
	}
</style>
