<script lang="ts">
	import type { BimaruPuzzle, CellValue } from '$lib/types/bimaru';
	import Cell from './Cell.svelte';
	import ClueBar from './ClueBar.svelte';
	import { countShipsInRow, countShipsInCol } from './logic';

	let {
		puzzle,
		grid,
		onCellClick,
		onCellRightClick,
		onRowFill,
		onColFill,
		hasError,
		cellSize = puzzle.cols <= 6 ? 44 : puzzle.cols <= 8 ? 40 : puzzle.cols <= 10 ? 36 : 30
	}: {
		puzzle: BimaruPuzzle;
		grid: CellValue[][];
		onCellClick: (row: number, col: number) => void;
		onCellRightClick?: (row: number, col: number) => void;
		onRowFill: (row: number) => void;
		onColFill: (col: number) => void;
		hasError: (row: number, col: number) => boolean;
		cellSize?: number;
	} = $props();

	let rowCounts = $derived(
		Array.from({ length: puzzle.rows }, (_, r) => countShipsInRow(grid, r, puzzle.cols))
	);

	let colCounts = $derived(
		Array.from({ length: puzzle.cols }, (_, c) => countShipsInCol(grid, c, puzzle.rows))
	);

	let clueSize = $derived(cellSize + 3);
</script>

<div class="board-wrapper" style:--cell-size="{cellSize}px" style:--clue-size="{clueSize}px">
	<div class="corner"></div>

	<ClueBar clues={puzzle.col_clues} counts={colCounts} direction="col" onClueClick={onColFill} />

	{#each Array(puzzle.rows) as _, r (r)}
		<button
			class="row-clue"
			class:satisfied={rowCounts[r] === puzzle.row_clues[r]}
			onclick={() => onRowFill(r)}
			title="Fill remaining cells with water"
		>
			{puzzle.row_clues[r]}
		</button>
		<div class="grid-row">
			{#each Array(puzzle.cols) as _, c (c)}
				<Cell
					value={grid[r][c]}
					{grid}
					row={r}
					col={c}
					rows={puzzle.rows}
					cols={puzzle.cols}
					isHint={puzzle.hints[r][c] !== 'empty'}
					isError={hasError(r, c)}
					onclick={() => onCellClick(r, c)}
					onrightclick={() => onCellRightClick?.(r, c)}
				/>
			{/each}
		</div>
	{/each}
</div>

<style>
	.board-wrapper {
		display: grid;
		grid-template-columns: var(--clue-size) 1fr;
		gap: 0;
		width: fit-content;
	}

	.corner {
		width: var(--clue-size);
		height: var(--clue-size);
	}

	.row-clue {
		width: var(--clue-size);
		height: var(--clue-size);
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

	.row-clue:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.row-clue.satisfied {
		color: var(--color-text-clue-sat);
	}

	.row-clue.satisfied:hover {
		color: var(--color-accent-light);
	}

	.grid-row {
		display: flex;
	}
</style>
