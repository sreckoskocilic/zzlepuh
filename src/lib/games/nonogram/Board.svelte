<script lang="ts">
	import type { NonogramPuzzle, CellState } from '$lib/types/nonogram';
	import Cell from './Cell.svelte';

	let {
		puzzle,
		grid,
		onCellClick,
		onCellRightClick,
		onRowClueFill,
		onColClueFill,
		hasError,
		cellSize = 28
	}: {
		puzzle: NonogramPuzzle;
		grid: CellState[][];
		onCellClick: (row: number, col: number) => void;
		onCellRightClick?: (row: number, col: number) => void;
		onRowClueFill?: (row: number) => void;
		onColClueFill?: (col: number) => void;
		hasError: (row: number, col: number) => boolean;
		cellSize?: number;
	} = $props();

	let maxRowClueLen = $derived(Math.max(1, ...puzzle.row_clues.map((c) => c.length)));
	let maxColClueLen = $derived(Math.max(1, ...puzzle.col_clues.map((c) => c.length)));
	let totalCols = $derived(maxRowClueLen + puzzle.cols);
	let totalRows = $derived(maxColClueLen + puzzle.rows);

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

	function thickR(i: number, j: number): boolean {
		if (j === totalCols - 1) return true;
		if (j === maxRowClueLen - 1) return true;
		if (j >= maxRowClueLen) {
			const gc = j - maxRowClueLen;
			return (gc + 1) % 5 === 0 && gc < puzzle.cols - 1;
		}
		return false;
	}

	function thickB(i: number, _j: number): boolean {
		if (i === totalRows - 1) return true;
		if (i === maxColClueLen - 1) return true;
		if (i >= maxColClueLen) {
			const gr = i - maxColClueLen;
			return (gr + 1) % 5 === 0 && gr < puzzle.rows - 1;
		}
		return false;
	}
</script>

<div
	class="board"
	style:--cell-size="{cellSize}px"
	style:--clue-font="{Math.max(11, Math.round(cellSize * 0.55))}px"
	style:grid-template-columns="repeat({totalCols}, {cellSize}px)"
	style:grid-template-rows="repeat({totalRows}, {cellSize}px)"
>
	{#each Array(totalRows) as _, i (i)}
		{#each Array(totalCols) as _, j (j)}
			{@const inGrid = i >= maxColClueLen && j >= maxRowClueLen}
			{@const inColClue = i < maxColClueLen && j >= maxRowClueLen}
			{@const inRowClue = i >= maxColClueLen && j < maxRowClueLen}

			{#if inGrid}
				{@const gr = i - maxColClueLen}
				{@const gc = j - maxRowClueLen}
				<div class="bc" class:tr={thickR(i, j)} class:tb={thickB(i, j)}>
					<Cell
						value={grid[gr][gc]}
						row={gr}
						col={gc}
						isError={hasError(gr, gc)}
						onclick={() => onCellClick(gr, gc)}
						onrightclick={() => onCellRightClick?.(gr, gc)}
					/>
				</div>
			{:else if inColClue}
				{@const gc = j - maxRowClueLen}
				{@const clue = puzzle.col_clues[gc]}
				{@const offset = maxColClueLen - clue.length}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="bc clue clickable"
					class:satisfied={isColSatisfied(gc)}
					class:tr={thickR(i, j)}
					class:tb={thickB(i, j)}
					onclick={() => onColClueFill?.(gc)}
				>
					{#if i >= offset}
						<span class="cn">{clue[i - offset]}</span>
					{/if}
				</div>
			{:else if inRowClue}
				{@const gr = i - maxColClueLen}
				{@const clue = puzzle.row_clues[gr]}
				{@const offset = maxRowClueLen - clue.length}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="bc clue clickable"
					class:satisfied={isRowSatisfied(gr)}
					class:tr={thickR(i, j)}
					class:tb={thickB(i, j)}
					onclick={() => onRowClueFill?.(gr)}
				>
					{#if j >= offset}
						<span class="cn">{clue[j - offset]}</span>
					{/if}
				</div>
			{:else}
				<div class="bc corner" class:tr={thickR(i, j)} class:tb={thickB(i, j)}></div>
			{/if}
		{/each}
	{/each}
</div>

<style>
	.board {
		display: grid;
		width: fit-content;
		border-radius: 3px;
		overflow: hidden;
		box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);

		--cell-bg: #e8e4d8;
		--cell-hover: #dcd8cc;
		--cell-fill: #1a1c1a;
		--cell-x: #8a8880;
		--gl: #c0b8a8;
		--gl-thick: #8a8070;

		border-top: 2px solid color-mix(in srgb, var(--color-text-muted) 40%, var(--color-accent-dim));
		border-left: 2px solid color-mix(in srgb, var(--color-text-muted) 40%, var(--color-accent-dim));
	}

	.bc {
		border-right: 1px solid var(--gl);
		border-bottom: 1px solid var(--gl);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.bc.tr {
		border-right: 2px solid var(--gl-thick);
	}

	.bc.tb {
		border-bottom: 2px solid var(--gl-thick);
	}

	.clue, .corner {
		background: var(--color-accent-dim);
		border-color: var(--color-border-cell);
	}

	.clue {
		color: var(--color-text-primary);
		transition: color 0.15s;
	}

	.clue.satisfied {
		color: var(--color-accent);
	}

	.clue.clickable {
		cursor: pointer;
	}

	.clue.clickable:hover {
		background: color-mix(in srgb, var(--color-accent) 15%, var(--color-accent-dim));
	}

	.clue.tr, .corner.tr {
		border-right-color: color-mix(in srgb, var(--color-text-muted) 40%, var(--color-accent-dim));
	}

	.clue.tb, .corner.tb {
		border-bottom-color: color-mix(in srgb, var(--color-text-muted) 40%, var(--color-accent-dim));
	}

	.cn {
		font-size: var(--clue-font, 0.9rem);
		font-weight: 600;
		line-height: 1;
	}
</style>
