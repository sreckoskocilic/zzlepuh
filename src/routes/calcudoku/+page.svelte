<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { calcudokuState } from '$lib/games/calcudoku/state.svelte';
	import Board from '$lib/games/calcudoku/Board.svelte';
	import Controls from '$lib/games/calcudoku/Controls.svelte';
	import WinOverlay from '$lib/games/bimaru/WinOverlay.svelte';
	import Leaderboard from '$lib/games/bimaru/Leaderboard.svelte';
	import { timer } from '$lib/stores/timer.svelte';
	import { statsStore } from '$lib/stores/stats.svelte';
	import { leaderboardStore } from '$lib/stores/leaderboard.svelte';
	import type { Difficulty } from '$lib/types/game';
	import type { GridSize } from '$lib/games/calcudoku/Controls.svelte';

	onMount(() => timer.reset());
	onDestroy(() => timer.pause());

	let difficulty: Difficulty = $state('medium');
	let gridSize: GridSize = $state(6);
	let winRecordedForGameId = $state(-1);
	let winTimeout: ReturnType<typeof setTimeout> | null = null;
	let showLeaderboard = $state(false);
	let lastRank: number | null = $state(null);
	let areaWidth = $state(0);
	let areaHeight = $state(0);

	let cellSize = $derived.by(() => {
		if (!calcudokuState.puzzle || !areaWidth || !areaHeight) return 48;
		const n = calcudokuState.puzzle.size;
		const fromW = (areaWidth - 4) / n;
		const fromH = (areaHeight - 48) / n;
		return Math.floor(Math.max(32, Math.min(96, fromW, fromH)));
	});

	async function handleNewGame(d: Difficulty, size: GridSize) {
		if (calcudokuState.isGenerating) return;
		if (winTimeout) { clearTimeout(winTimeout); winTimeout = null; }
		if (calcudokuState.isActive) {
			statsStore.recordLoss('calcudoku');
		}
		difficulty = d;
		gridSize = size;
		winRecordedForGameId = -1;
		lastRank = null;
		await calcudokuState.startNewGame(d, size);
		timer.restart();
	}

	function handleHint() {
		calcudokuState.requestHint();
	}

	function handleCheck() {
		calcudokuState.requestCheck();
	}

	function handleReset() {
		calcudokuState.reset();
		timer.restart();
	}

	function handleCellClick(row: number, col: number) {
		calcudokuState.selectCell(row, col);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey) {
			if (e.key === 'z' && !e.shiftKey) {
				e.preventDefault();
				calcudokuState.undo();
			} else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
				e.preventDefault();
				calcudokuState.redo();
			}
			return;
		}

		if (!calcudokuState.puzzle) return;

		const key = e.key;
		if (key >= '1' && key <= '9') {
			const num = parseInt(key);
			if (num <= calcudokuState.puzzle.size) {
				calcudokuState.enterNumber(num, e.shiftKey ? true : undefined);
			}
		} else if (key === 'n' || key === 'N') {
			calcudokuState.notesMode = !calcudokuState.notesMode;
		} else if (key === 'Delete' || key === 'Backspace') {
			e.preventDefault();
			calcudokuState.clearCell();
		} else if (key.startsWith('Arrow')) {
			e.preventDefault();
			moveSelection(key);
		} else if (key === 'Escape') {
			calcudokuState.selectedCell = null;
		}
	}

	function moveSelection(key: string) {
		if (!calcudokuState.puzzle) return;
		const n = calcudokuState.puzzle.size;
		let [r, c] = calcudokuState.selectedCell ?? [0, 0];

		if (key === 'ArrowUp') r = Math.max(0, r - 1);
		else if (key === 'ArrowDown') r = Math.min(n - 1, r + 1);
		else if (key === 'ArrowLeft') c = Math.max(0, c - 1);
		else if (key === 'ArrowRight') c = Math.min(n - 1, c + 1);

		calcudokuState.selectCell(r, c);
	}

	$effect(() => {
		if (calcudokuState.isComplete && winRecordedForGameId !== calcudokuState.currentGameId) {
			winRecordedForGameId = calcudokuState.currentGameId;
			timer.pause();
			const gameDifficulty = (calcudokuState.puzzle?.difficulty ?? difficulty) as Difficulty;
			const gameSize = gridSize;
			const ms = timer.elapsedMs;
			const hints = calcudokuState.hintsUsed;
			const recordedGameId = calcudokuState.currentGameId;
			winTimeout = setTimeout(async () => {
				winTimeout = null;
				await statsStore.recordWin('calcudoku', gameDifficulty, ms, hints);
				const rank = await leaderboardStore.addEntry(
					'calcudoku',
					gameDifficulty,
					gameSize,
					ms,
					hints
				);
				if (recordedGameId === calcudokuState.currentGameId) lastRank = rank;
			}, 0);
		}
	});

	$effect(() => {
		leaderboardStore.load('calcudoku', difficulty, gridSize);
	});

	$effect(() => {
		statsStore.load('calcudoku');
	});

	let leaderboardEntries = $derived(leaderboardStore.getEntries('calcudoku', difficulty, gridSize));
	let stats = $derived(statsStore.getStats('calcudoku'));
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="game-page">
	<div class="toolbar">
		<div class="toolbar-controls">
			<Controls
				isGenerating={calcudokuState.isGenerating}
				isActive={calcudokuState.isActive}
				onNewGame={handleNewGame}
				onHint={handleHint}
				onCheck={handleCheck}
				onReset={handleReset}
				bind:difficulty
				bind:gridSize
			/>
		</div>

		<button
			class="btn-undo"
			disabled={!calcudokuState.canUndo}
			onclick={() => calcudokuState.undo()}
			title="Undo (Ctrl+Z)"
		>
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
				<path
					d="M3 5h6a3 3 0 0 1 0 6H7"
					stroke="currentColor"
					stroke-width="1.4"
					stroke-linecap="round"
				/>
				<path
					d="M5.5 2.5 3 5l2.5 2.5"
					stroke="currentColor"
					stroke-width="1.4"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
		<button
			class="btn-undo"
			disabled={!calcudokuState.canRedo}
			onclick={() => calcudokuState.redo()}
			title="Redo (Ctrl+Shift+Z)"
		>
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="transform: scaleX(-1)">
				<path
					d="M3 5h6a3 3 0 0 1 0 6H7"
					stroke="currentColor"
					stroke-width="1.4"
					stroke-linecap="round"
				/>
				<path
					d="M5.5 2.5 3 5l2.5 2.5"
					stroke="currentColor"
					stroke-width="1.4"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>

		{#if calcudokuState.puzzle}
			<span class="timer" data-testid="timer">{timer.formatted}</span>
		{/if}
	</div>

	{#if calcudokuState.error}
		<p class="error" data-testid="error">{calcudokuState.error}</p>
	{/if}

	{#if calcudokuState.puzzle}
		<div class="board-area" bind:clientWidth={areaWidth} bind:clientHeight={areaHeight}>
			<div class="board-container">
				<Board
					puzzle={calcudokuState.puzzle}
					grid={calcudokuState.grid}
					notes={calcudokuState.notes}
					selectedCell={calcudokuState.selectedCell}
					onCellClick={handleCellClick}
					hasError={(r, c) => calcudokuState.hasError(r, c)}
					{cellSize}
				/>

				{#if calcudokuState.isComplete}
					<WinOverlay
						hintsUsed={calcudokuState.hintsUsed}
						elapsedMs={timer.elapsedMs}
						leaderboardRank={lastRank}
						onNewGame={() => handleNewGame(difficulty, gridSize)}
					/>
				{/if}
			</div>
		</div>

		<div class="number-pad" data-testid="number-pad">
			<button
				class="num-btn notes-toggle"
				class:active={calcudokuState.notesMode}
				onclick={() => (calcudokuState.notesMode = !calcudokuState.notesMode)}
				title="Notes mode (N) — Shift+number also works"
			>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
					<path d="M2 12L10.5 3.5a1.4 1.4 0 0 1 2 2L4 12H2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
					<path d="M9 5l2 2" stroke="currentColor" stroke-width="1.3"/>
				</svg>
			</button>
			{#each Array(calcudokuState.puzzle.size) as _, i (i)}
				<button
					class="num-btn"
					data-testid="num-{i + 1}"
					onclick={() => calcudokuState.enterNumber(i + 1)}
					disabled={!calcudokuState.selectedCell}
				>
					{i + 1}
				</button>
			{/each}
			<button
				class="num-btn num-clear"
				data-testid="num-clear"
				onclick={() => calcudokuState.clearCell()}
				disabled={!calcudokuState.selectedCell}
			>
				✕
			</button>
		</div>

		<div class="stats-bar" data-testid="stats-bar">
			<span>Games: {stats.gamesPlayed}</span>
			<span>Won: {stats.gamesWon}</span>
			<span>Streak: {stats.currentStreak}</span>
			{#if stats.bestTimeMs[difficulty]}
				<span>Best: {formatTime(stats.bestTimeMs[difficulty]!)}</span>
			{/if}
			<button class="btn-leaderboard" onclick={() => (showLeaderboard = !showLeaderboard)}>
				{showLeaderboard ? 'Hide Board' : 'Leaderboard'}
			</button>
		</div>

		{#if showLeaderboard}
			<Leaderboard entries={leaderboardEntries} highlightRank={lastRank} />
		{/if}
	{:else if !calcudokuState.isGenerating}
		<div class="empty-state" data-testid="empty-state">
			<p>Click "New Game" to start</p>
		</div>
	{/if}
</div>

<script lang="ts" module>
	function formatTime(ms: number): string {
		const secs = Math.floor(ms / 1000);
		const mins = Math.floor(secs / 60);
		return `${String(mins).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
	}
</script>

<style>
	.game-page {
		height: 100vh;
		display: flex;
		flex-direction: column;
		padding: 0.8rem 1.2rem;
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.toolbar-controls {
		flex: 1;
		min-width: 0;
	}

	.timer {
		font-variant-numeric: tabular-nums;
		font-size: 0.9rem;
		background: var(--color-surface);
		padding: 0.25rem 0.6rem;
		border-radius: 5px;
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.board-area {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 0;
		padding: 0.5rem 0;
	}

	.board-container {
		position: relative;
	}

	.number-pad {
		display: flex;
		gap: 0.3rem;
		justify-content: center;
		padding: 0.4rem 0;
	}

	.num-btn {
		width: 36px;
		height: 36px;
		border: 1px solid var(--color-border-cell);
		border-radius: 6px;
		background: var(--color-surface);
		color: var(--color-text-primary);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		transition:
			background 0.1s,
			border-color 0.1s;
	}

	.num-btn:hover:not(:disabled) {
		background: var(--color-surface-hover);
		border-color: var(--color-accent-dim);
		color: var(--color-accent);
	}

	.num-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.num-clear {
		color: var(--color-text-muted);
	}

	.notes-toggle {
		color: var(--color-text-muted);
		transition:
			color 0.15s,
			background 0.15s,
			border-color 0.15s;
	}

	.notes-toggle.active {
		color: var(--color-accent);
		border-color: var(--color-accent);
		background: var(--color-accent-dim);
	}

	.stats-bar {
		display: flex;
		gap: 1.2rem;
		font-size: 0.85rem;
		color: var(--color-text-primary);
		opacity: 0.7;
		padding: 0.4rem 0;
	}

	.empty-state {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
		font-size: 1.05rem;
	}

	.btn-leaderboard {
		margin-left: auto;
		background: none;
		border: 1px solid var(--color-border-cell);
		border-radius: 5px;
		padding: 0.15rem 0.5rem;
		font-size: 0.8rem;
		color: var(--color-text-muted);
		cursor: pointer;
		font-family: inherit;
	}

	.btn-leaderboard:hover {
		color: var(--color-accent);
		border-color: var(--color-accent-dim);
	}

	.btn-undo {
		background: none;
		border: 1px solid var(--color-border-cell);
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0.3rem;
		border-radius: 5px;
		display: flex;
		align-items: center;
		transition:
			color 0.15s,
			border-color 0.15s;
	}

	.btn-undo:hover:not(:disabled) {
		color: var(--color-accent);
		border-color: var(--color-accent-dim);
	}

	.btn-undo:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.error {
		color: var(--color-error);
		font-size: 0.95rem;
		margin-top: 0.5rem;
	}
</style>
