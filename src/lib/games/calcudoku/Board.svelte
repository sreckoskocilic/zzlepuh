<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import type { CalcudokuPuzzle } from '$lib/types/calcudoku';
	import Cell from './Cell.svelte';

	let {
		puzzle,
		grid,
		notes,
		selectedCell,
		onCellClick,
		hasError,
		cellSize = 48
	}: {
		puzzle: CalcudokuPuzzle;
		grid: number[][];
		notes: number[][][];
		selectedCell: [number, number] | null;
		onCellClick: (row: number, col: number) => void;
		hasError: (row: number, col: number) => boolean;
		cellSize?: number;
	} = $props();

	let cageMap = $derived.by(() => {
		const map: number[][] = Array.from({ length: puzzle.size }, () =>
			Array(puzzle.size).fill(-1)
		);
		puzzle.cages.forEach((cage, i) => {
			cage.cells.forEach(([r, c]) => {
				map[r][c] = i;
			});
		});
		return map;
	});

	let cageLabels = $derived.by(() => {
		const labels = new SvelteMap<string, string>();
		for (const cage of puzzle.cages) {
			if (cage.cells.length === 0) continue;
			const sorted = [...cage.cells].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
			const [r, c] = sorted[0];
			const opSymbol =
				cage.operation === 'none'
					? ''
					: cage.operation === 'add'
						? '+'
						: cage.operation === 'subtract'
							? '−'
							: cage.operation === 'multiply'
								? '×'
								: '÷';
			labels.set(`${r},${c}`, `${cage.target}${opSymbol}`);
		}
		return labels;
	});

	function cageRight(r: number, c: number): boolean {
		return c === puzzle.size - 1 || cageMap[r][c] !== cageMap[r][c + 1];
	}

	function cageBottom(r: number, c: number): boolean {
		return r === puzzle.size - 1 || cageMap[r][c] !== cageMap[r + 1][c];
	}
</script>

<div
	class="board"
	style:--cell-size="{cellSize}px"
	style:grid-template-columns="repeat({puzzle.size}, {cellSize}px)"
	style:grid-template-rows="repeat({puzzle.size}, {cellSize}px)"
>
	{#each Array(puzzle.size) as _, r (r)}
		{#each Array(puzzle.size) as _, c (c)}
			<div class="bc" class:cr={cageRight(r, c)} class:cb={cageBottom(r, c)}>
				<Cell
					value={grid[r][c]}
					label={cageLabels.get(`${r},${c}`) ?? ''}
					notes={notes[r]?.[c] ?? []}
					puzzleSize={puzzle.size}
					{cellSize}
					row={r}
					col={c}
					isSelected={selectedCell !== null &&
						selectedCell[0] === r &&
						selectedCell[1] === c}
					isError={hasError(r, c)}
					onclick={() => onCellClick(r, c)}
				/>
			</div>
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
		--cell-selected: #b8dcc8;
		--cell-border: #d0c8b8;
		--cage-border: #5a5550;
		--label-color: #777;
		--num-color: #1a1c1a;

		border-top: 2px solid var(--cage-border);
		border-left: 2px solid var(--cage-border);
	}

	.bc {
		border-right: 1px solid var(--cell-border);
		border-bottom: 1px solid var(--cell-border);
	}

	.bc.cr {
		border-right: 2px solid var(--cage-border);
	}

	.bc.cb {
		border-bottom: 2px solid var(--cage-border);
	}
</style>
