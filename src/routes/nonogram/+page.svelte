<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { nonogramState } from '$lib/games/nonogram/state.svelte';
	import Board from '$lib/games/nonogram/Board.svelte';
	import Controls from '$lib/games/nonogram/Controls.svelte';
	import WinOverlay from '$lib/games/bimaru/WinOverlay.svelte';
	import Leaderboard from '$lib/games/bimaru/Leaderboard.svelte';
	import { timer } from '$lib/stores/timer.svelte';
	import { statsStore } from '$lib/stores/stats.svelte';
	import { leaderboardStore } from '$lib/stores/leaderboard.svelte';
	import type { Difficulty } from '$lib/types/game';
	import type { GridSize } from '$lib/games/nonogram/Controls.svelte';

	onMount(() => timer.reset());
	onDestroy(() => timer.pause());

	let difficulty: Difficulty = $state('medium');
	let gridSize: GridSize = $state(10);
	let winRecordedForGameId = $state(-1);
	let winTimeout: ReturnType<typeof setTimeout> | null = null;
	let showLeaderboard = $state(false);
	let lastRank: number | null = $state(null);
	let areaWidth = $state(0);
	let areaHeight = $state(0);

	let cellSize = $derived.by(() => {
		if (!nonogramState.puzzle || !areaWidth || !areaHeight) return 28;
		const { rows, cols, row_clues, col_clues } = nonogramState.puzzle;
		const maxRowClueLen = Math.max(...row_clues.map((c: number[]) => c.length));
		const maxColClueLen = Math.max(...col_clues.map((c: number[]) => c.length));
		const totalCols = maxRowClueLen + cols;
		const totalRows = maxColClueLen + rows;
		const fromW = (areaWidth - 4) / totalCols;
		const fromH = (areaHeight - 4) / totalRows;
		return Math.floor(Math.max(14, Math.min(fromW, fromH)));
	});

	async function handleNewGame(d: Difficulty, size: GridSize) {
		if (nonogramState.isGenerating) return;
		if (winTimeout) { clearTimeout(winTimeout); winTimeout = null; }
		// Don't book a loss while a win validation is in flight — the grid is full
		// and being checked, so abandoning here is a pending win, not a loss.
		if (nonogramState.isActive && !nonogramState.isValidatingSolution) {
			statsStore.recordLoss('nonogram');
		}
		difficulty = d;
		gridSize = size;
		winRecordedForGameId = -1;
		lastRank = null;
		await nonogramState.startNewGame(d, size, size);
		timer.restart();
	}

	function handleHint() {
		nonogramState.requestHint();
	}

	function handleCheck() {
		nonogramState.requestCheck();
	}

	function handleReset() {
		nonogramState.reset();
		timer.restart();
	}

	function handleCellClick(row: number, col: number) {
		nonogramState.fillCell(row, col);
	}

	function handleCellRightClick(row: number, col: number) {
		nonogramState.markCell(row, col);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey) {
			if (e.key === 'z' && !e.shiftKey) {
				e.preventDefault();
				nonogramState.undo();
			} else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
				e.preventDefault();
				nonogramState.redo();
			}
		}
	}

	$effect(() => {
		if (nonogramState.isComplete && winRecordedForGameId !== nonogramState.currentGameId) {
			winRecordedForGameId = nonogramState.currentGameId;
			timer.pause();
			const gameDifficulty = (nonogramState.puzzle?.difficulty ?? difficulty) as Difficulty;
			const gameSize = gridSize;
			const ms = timer.elapsedMs;
			const hints = nonogramState.hintsUsed;
			const recordedGameId = nonogramState.currentGameId;
			winTimeout = setTimeout(async () => {
				winTimeout = null;
				await statsStore.recordWin('nonogram', gameDifficulty, ms, hints);
				const rank = await leaderboardStore.addEntry('nonogram', gameDifficulty, gameSize, ms, hints);
				if (recordedGameId === nonogramState.currentGameId) lastRank = rank;
			}, 0);
		}
	});

	// Resume the paused timer when an undo reopens an already-won game (same gameId).
	// New game / reset bump or keep gameId but call timer.restart() themselves, so skip those.
	let prevComplete = false;
	let prevGameId = -1;
	$effect(() => {
		const complete = nonogramState.isComplete;
		const gid = nonogramState.currentGameId;
		if (prevComplete && !complete && gid === prevGameId && !timer.isRunning) {
			timer.start();
		}
		prevComplete = complete;
		prevGameId = gid;
	});

	$effect(() => {
		leaderboardStore.load('nonogram', difficulty, gridSize);
	});

	$effect(() => {
		statsStore.load('nonogram');
	});

	let leaderboardEntries = $derived(leaderboardStore.getEntries('nonogram', difficulty, gridSize));
	let stats = $derived(statsStore.getStats('nonogram'));
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="game-page">
	<div class="toolbar">
		<div class="toolbar-controls">
			<Controls
				isGenerating={nonogramState.isGenerating}
				isActive={nonogramState.isActive}
				onNewGame={handleNewGame}
				onHint={handleHint}
				onCheck={handleCheck}
				onReset={handleReset}
				bind:difficulty
				bind:gridSize
			/>
		</div>

		<button class="btn-undo" disabled={!nonogramState.canUndo} onclick={() => nonogramState.undo()} title="Undo (Ctrl+Z)">
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
				<path d="M3 5h6a3 3 0 0 1 0 6H7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
				<path d="M5.5 2.5 3 5l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>
		<button class="btn-undo" disabled={!nonogramState.canRedo} onclick={() => nonogramState.redo()} title="Redo (Ctrl+Shift+Z)">
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="transform: scaleX(-1)">
				<path d="M3 5h6a3 3 0 0 1 0 6H7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
				<path d="M5.5 2.5 3 5l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>

		{#if nonogramState.puzzle}
			<span class="timer" data-testid="timer">{timer.formatted}</span>
		{/if}
	</div>

	{#if nonogramState.error}
		<p class="error" data-testid="error">{nonogramState.error}</p>
	{/if}

	{#if nonogramState.puzzle}
		<div class="board-area" bind:clientWidth={areaWidth} bind:clientHeight={areaHeight}>
			<div class="board-container">
				<Board
					puzzle={nonogramState.puzzle}
					grid={nonogramState.grid}
					onCellClick={handleCellClick}
					onCellRightClick={handleCellRightClick}
					onRowClueFill={(r) => nonogramState.markRemainingInRow(r)}
					onColClueFill={(c) => nonogramState.markRemainingInCol(c)}
					hasError={(r, c) => nonogramState.hasError(r, c)}
					{cellSize}
				/>

				{#if nonogramState.isComplete}
					<WinOverlay
						hintsUsed={nonogramState.hintsUsed}
						elapsedMs={timer.elapsedMs}
						leaderboardRank={lastRank}
						onNewGame={() => handleNewGame(difficulty, gridSize)}
					/>
				{/if}
			</div>
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
	{:else if !nonogramState.isGenerating}
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
		transition: color 0.15s, border-color 0.15s;
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
