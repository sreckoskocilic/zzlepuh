<script lang="ts">
	let {
		clues,
		counts,
		direction,
		onClueClick
	}: {
		clues: number[];
		counts: number[];
		direction: 'row' | 'col';
		onClueClick: (index: number) => void;
	} = $props();
</script>

<div class="clue-bar" class:horizontal={direction === 'col'} class:vertical={direction === 'row'}>
	{#each clues as clue, i (i)}
		<button
			class="clue"
			class:satisfied={counts[i] === clue}
			onclick={() => onClueClick(i)}
			title="Fill remaining cells with water"
		>
			{clue}
		</button>
	{/each}
</div>

<style>
	.clue-bar {
		display: flex;
		gap: 0;
	}

	.horizontal {
		flex-direction: row;
	}

	.vertical {
		flex-direction: column;
	}

	.clue {
		width: var(--clue-size, 39px);
		height: var(--clue-size, 39px);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-clue);
		transition: color 0.15s, background 0.15s;
		background: transparent;
		border: none;
		cursor: pointer;
		font-family: inherit;
		border-radius: 4px;
		padding: 0;
	}

	.clue:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.clue.satisfied {
		color: var(--color-text-clue-sat);
	}

	.clue.satisfied:hover {
		color: var(--color-accent-light);
	}
</style>
