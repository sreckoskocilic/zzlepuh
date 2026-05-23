<script lang="ts">
	import { onDestroy } from 'svelte';
	import { bimaruState } from '$lib/games/bimaru/state.svelte';
	import Board from '$lib/games/bimaru/Board.svelte';
	import Fleet from '$lib/games/bimaru/Fleet.svelte';
	import Controls from '$lib/games/bimaru/Controls.svelte';
	import WinOverlay from '$lib/games/bimaru/WinOverlay.svelte';
	import { timer } from '$lib/stores/timer.svelte';
	import { statsStore } from '$lib/stores/stats.svelte';
	import { leaderboardStore } from '$lib/stores/leaderboard.svelte';
	import Leaderboard from '$lib/games/bimaru/Leaderboard.svelte';
	import type { Difficulty } from '$lib/types/game';
	import type { GridSize } from '$lib/games/bimaru/Controls.svelte';

	onDestroy(() => timer.pause());

	let difficulty: Difficulty = $state('medium');
	let gridSize: GridSize = $state(10);
	let winRecordedForGameId = -1;
	let showLeaderboard = $state(false);
	let lastRank: number | null = $state(null);
	let areaWidth = $state(0);
	let areaHeight = $state(0);

	let cellSize = $derived.by(() => {
		if (!bimaruState.puzzle || !areaWidth || !areaHeight) return 36;
		const { rows, cols } = bimaruState.puzzle;
		const fleetSpace = 150;
		const availW = areaWidth - fleetSpace;
		const availH = areaHeight;
		const fromW = availW / (cols + 1) - 3;
		const fromH = availH / (rows + 1) - 3;
		return Math.floor(Math.max(24, Math.min(72, Math.min(fromW, fromH))));
	});

	async function handleNewGame(d: Difficulty, size: GridSize) {
		difficulty = d;
		gridSize = size;
		winRecordedForGameId = -1;
		lastRank = null;
		await bimaruState.startNewGame(d, size, size);
		timer.restart();
	}

	function handleHint() {
		bimaruState.requestHint();
	}

	function handleCheck() {
		bimaruState.requestCheck();
	}

	function handleReset() {
		bimaruState.reset();
		timer.restart();
	}

	function handleCellClick(row: number, col: number) {
		bimaruState.placeShip(row, col);
	}

	function handleCellRightClick(row: number, col: number) {
		bimaruState.placeWater(row, col);
	}

	function handleRowFill(row: number) {
		bimaruState.fillRowWater(row);
	}

	function handleColFill(col: number) {
		bimaruState.fillColWater(col);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey) {
			if (e.key === 'z' && !e.shiftKey) {
				e.preventDefault();
				bimaruState.undo();
			} else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
				e.preventDefault();
				bimaruState.redo();
			}
		}
	}

	$effect(() => {
		if (bimaruState.isComplete && winRecordedForGameId !== bimaruState.currentGameId) {
			winRecordedForGameId = bimaruState.currentGameId;
			timer.pause();
			const gameDifficulty = (bimaruState.puzzle?.difficulty ?? difficulty) as Difficulty;
			const gameSize = gridSize;
			const ms = timer.elapsedMs;
			const hints = bimaruState.hintsUsed;
			setTimeout(async () => {
				await statsStore.recordWin('bimaru', gameDifficulty, ms, hints);
				const rank = await leaderboardStore.addEntry('bimaru', gameDifficulty, gameSize, ms, hints);
				lastRank = rank;
			}, 0);
		}
	});

	$effect(() => {
		leaderboardStore.load('bimaru', difficulty, gridSize);
	});

	$effect(() => {
		statsStore.load('bimaru');
	});

	let leaderboardEntries = $derived(leaderboardStore.getEntries('bimaru', difficulty, gridSize));
	let stats = $derived(statsStore.getStats('bimaru'));
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="game-page">
	<div class="toolbar">
		<div class="toolbar-controls">
			<Controls
				isGenerating={bimaruState.isGenerating}
				isActive={bimaruState.isActive}
				onNewGame={handleNewGame}
				onHint={handleHint}
				onCheck={handleCheck}
				onReset={handleReset}
				bind:difficulty
				bind:gridSize
			/>
		</div>

		<button class="btn-undo" disabled={!bimaruState.canUndo} onclick={() => bimaruState.undo()} title="Undo (Ctrl+Z)">
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
				<path d="M3 5h6a3 3 0 0 1 0 6H7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
				<path d="M5.5 2.5 3 5l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>
		<button class="btn-undo" disabled={!bimaruState.canRedo} onclick={() => bimaruState.redo()} title="Redo (Ctrl+Shift+Z)">
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="transform: scaleX(-1)">
				<path d="M3 5h6a3 3 0 0 1 0 6H7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
				<path d="M5.5 2.5 3 5l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>

		{#if bimaruState.puzzle}
			<span class="timer" data-testid="timer">{timer.formatted}</span>
		{/if}

	</div>

	{#if bimaruState.error}
		<p class="error" data-testid="error">{bimaruState.error}</p>
	{/if}

	{#if bimaruState.puzzle}
		<div class="board-area" bind:clientWidth={areaWidth} bind:clientHeight={areaHeight}>
			<div class="board-container">
				<Board
					puzzle={bimaruState.puzzle}
					grid={bimaruState.grid}
					onCellClick={handleCellClick}
					onCellRightClick={handleCellRightClick}
					onRowFill={handleRowFill}
					onColFill={handleColFill}
					hasError={(r, c) => bimaruState.hasError(r, c)}
					{cellSize}
				/>

				{#if bimaruState.isComplete}
					<WinOverlay
						hintsUsed={bimaruState.hintsUsed}
						elapsedMs={timer.elapsedMs}
						leaderboardRank={lastRank}
						onNewGame={() => handleNewGame(difficulty, gridSize)}
					/>
				{/if}
			</div>

			<Fleet puzzle={bimaruState.puzzle} grid={bimaruState.grid} />
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
	{:else if !bimaruState.isGenerating}
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
		gap: 1.5rem;
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
		color: var(--color-text-muted);
		opacity: 0.6;
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
