<script lang="ts">
	import type { NonogramPuzzle, CellState } from '$lib/types/nonogram';
	import Cell from './Cell.svelte';

	let {
		puzzle,
		grid,
		onCellClick,
		onCellRightClick,
		hasError,
		cellSize = 28
	}: {
		puzzle: NonogramPuzzle;
		grid: CellState[][];
		onCellClick: (row: number, col: number) => void;
		onCellRightClick?: (row: number, col: number) => void;
		hasError: (row: number, col: number) => boolean;
		cellSize?: number;
	} = $props();

	let maxRowClueLen = $derived(Math.max(...puzzle.row_clues.map((c) => c.length)));
	let maxColClueLen = $derived(Math.max(...puzzle.col_clues.map((c) => c.length)));

	function isRowSatisfied(r: number): boolean {
		const line = grid[r];
		const actual = lineToCounts(line);
		return arrEq(actual, puzzle.row_clues[r]);
	}

	function isColSatisfied(c: number): boolean {
		const line = Array.from({ length: puzzle.rows }, (_, r) => grid[r][c]);
		const actual = lineToCounts(line);
		return arrEq(actual, puzzle.col_clues[c]);
	}

	function lineToCounts(line: CellState[]): number[] {
		const counts: number[] = [];
		let run = 0;
		for (const cell of line) {
			if (cell === 'filled') {
				run++;
			} else if (run > 0) {
				counts.push(run);
				run = 0;
			}
		}
		if (run > 0) counts.push(run);
		return counts.length ? counts : [0];
	}

	function arrEq(a: number[], b: number[]): boolean {
		return a.length === b.length && a.every((v, i) => v === b[i]);
	}
</script>

<div
	class="board-wrapper"
	style:--cell-size="{cellSize}px"
	style:--row-clue-cols={maxRowClueLen}
	style:--col-clue-rows={maxColClueLen}
>
	<!-- Column clues area -->
	<div class="col-clues-spacer"></div>
	<div class="col-clues-row">
		{#each puzzle.col_clues as clue, c (c)}
			<div class="col-clue" class:satisfied={isColSatisfied(c)}>
				{#each Array(maxColClueLen - clue.length) as _, i (i)}
					<span class="clue-num empty-clue"></span>
				{/each}
				{#each clue as num, i (i)}
					<span class="clue-num">{num}</span>
				{/each}
			</div>
		{/each}
	</div>

	<!-- Grid rows with row clues -->
	{#each Array(puzzle.rows) as _, r (r)}
		<div class="row-clue" class:satisfied={isRowSatisfied(r)}>
			{#each Array(maxRowClueLen - puzzle.row_clues[r].length) as _, i (i)}
				<span class="clue-num empty-clue"></span>
			{/each}
			{#each puzzle.row_clues[r] as num, i (i)}
				<span class="clue-num">{num}</span>
			{/each}
		</div>
		<div class="grid-row">
			{#each Array(puzzle.cols) as _, c (c)}
				<Cell
					value={grid[r][c]}
					row={r}
					col={c}
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
		grid-template-columns: auto 1fr;
		gap: 0;
		width: fit-content;
	}

	.col-clues-spacer {
		min-width: 0;
	}

	.col-clues-row {
		display: flex;
	}

	.col-clue {
		width: calc(var(--cell-size) + 3px);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		padding-bottom: 0.3rem;
		color: var(--color-text-primary);
		opacity: 0.8;
		transition: color 0.15s, opacity 0.15s;
	}

	.col-clue.satisfied {
		color: var(--color-accent);
		opacity: 1;
	}

	.row-clue {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.15rem;
		padding-right: 0.4rem;
		color: var(--color-text-primary);
		opacity: 0.8;
		transition: color 0.15s, opacity 0.15s;
	}

	.row-clue.satisfied {
		color: var(--color-accent);
		opacity: 1;
	}

	.clue-num {
		font-size: 1.1rem;
		font-weight: 600;
		min-width: 1.1em;
		text-align: center;
		line-height: 1.35;
	}

	.empty-clue {
		visibility: hidden;
	}

	.grid-row {
		display: flex;
	}
</style>
