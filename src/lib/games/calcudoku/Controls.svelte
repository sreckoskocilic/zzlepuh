<script lang="ts">
	import type { Difficulty } from '$lib/types/game';

	export type GridSize = 4 | 5 | 6 | 7 | 8 | 9;

	let {
		isGenerating = false,
		isActive = false,
		onNewGame,
		onHint,
		onCheck,
		onReset,
		difficulty = $bindable('medium'),
		gridSize = $bindable(6 as GridSize)
	}: {
		isGenerating?: boolean;
		isActive?: boolean;
		onNewGame: (d: Difficulty, size: GridSize) => void;
		onHint: () => void;
		onCheck: () => void;
		onReset: () => void;
		difficulty?: Difficulty;
		gridSize?: GridSize;
	} = $props();
</script>

<div class="controls">
	<button
		class="btn-primary"
		data-testid="btn-new-game"
		onclick={() => onNewGame(difficulty, gridSize)}
		disabled={isGenerating}
	>
		{isGenerating ? 'Generating...' : 'New Game'}
	</button>
	<button class="btn" data-testid="btn-hint" onclick={onHint} disabled={!isActive}>Hint</button>
	<button class="btn" data-testid="btn-check" onclick={onCheck} disabled={!isActive}>Check</button>
	<button class="btn" data-testid="btn-reset" onclick={onReset} disabled={!isActive}>Reset</button>

	<div class="selectors">
		<select class="select" data-testid="size-select" bind:value={gridSize}>
			<option value={4}>4×4</option>
			<option value={5}>5×5</option>
			<option value={6}>6×6</option>
			<option value={7}>7×7</option>
			<option value={8}>8×8</option>
			<option value={9}>9×9</option>
		</select>
		<select class="select" data-testid="difficulty-select" bind:value={difficulty}>
			<option value="easy">Easy</option>
			<option value="medium">Medium</option>
			<option value="hard">Hard</option>
		</select>
	</div>
</div>

<style>
	.controls {
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}

	.btn,
	.btn-primary {
		padding: 0.35rem 0.7rem;
		border: none;
		border-radius: 5px;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		font-family: inherit;
		transition: opacity 0.15s;
	}

	.btn {
		background: var(--color-surface);
		color: var(--color-text-muted);
	}

	.btn:hover:not(:disabled) {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.btn-primary {
		background: var(--color-accent);
		color: var(--color-bg-primary);
		font-weight: 600;
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn:disabled,
	.btn-primary:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.selectors {
		display: flex;
		gap: 0.4rem;
		margin-left: auto;
	}

	.select {
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--color-border-cell);
		border-radius: 5px;
		background: var(--color-surface);
		color: var(--color-text-primary);
		font-size: 0.9rem;
		font-family: inherit;
	}
</style>
