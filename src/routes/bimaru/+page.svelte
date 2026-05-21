<script lang="ts">
	import { onDestroy } from 'svelte';
	import { bimaruState } from '$lib/games/bimaru/state.svelte';
	import Board from '$lib/games/bimaru/Board.svelte';
	import Fleet from '$lib/games/bimaru/Fleet.svelte';
	import Controls from '$lib/games/bimaru/Controls.svelte';
	import WinOverlay from '$lib/games/bimaru/WinOverlay.svelte';
	import { timer } from '$lib/stores/timer.svelte';
	import { statsStore } from '$lib/stores/stats.svelte';
	import type { Difficulty } from '$lib/types/game';
	import type { GridSize } from '$lib/games/bimaru/Controls.svelte';

	onDestroy(() => timer.pause());

	let difficulty: Difficulty = $state('medium');
	let gridSize: GridSize = $state(10);
	let winRecorded = false;

	async function handleNewGame(d: Difficulty, size: GridSize) {
		difficulty = d;
		gridSize = size;
		winRecorded = false;
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
		bimaruState.cycleCell(row, col);
	}

	function handleRowFill(row: number) {
		bimaruState.fillRowWater(row);
	}

	function handleColFill(col: number) {
		bimaruState.fillColWater(col);
	}

	$effect(() => {
		if (bimaruState.isComplete && !winRecorded) {
			winRecorded = true;
			timer.pause();
			const gameDifficulty = (bimaruState.puzzle?.difficulty ?? difficulty) as Difficulty;
			setTimeout(() => {
				statsStore.recordWin('bimaru', gameDifficulty, timer.elapsedMs, bimaruState.hintsUsed);
			}, 0);
		}
	});

	let stats = $derived(statsStore.getStats('bimaru'));
</script>

<div class="game-container">
	<div class="game-header">
		<h2>Bimaru</h2>
		{#if bimaruState.puzzle}
			<span class="timer" data-testid="timer">{timer.formatted}</span>
		{/if}
	</div>

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

	{#if bimaruState.error}
		<p class="error" data-testid="error">{bimaruState.error}</p>
	{/if}

	{#if bimaruState.puzzle}
		<div class="board-area">
			<div class="board-container">
				<Board
					puzzle={bimaruState.puzzle}
					grid={bimaruState.grid}
					onCellClick={handleCellClick}
					onRowFill={handleRowFill}
					onColFill={handleColFill}
					hasError={(r, c) => bimaruState.hasError(r, c)}
				/>

				{#if bimaruState.isComplete}
					<WinOverlay
						hintsUsed={bimaruState.hintsUsed}
						elapsedMs={timer.elapsedMs}
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
		</div>
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
	.game-container {
		padding: 1.5rem;
		max-width: 700px;
		margin: 0 auto;
	}

	.game-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.timer {
		font-variant-numeric: tabular-nums;
		font-size: 1rem;
		background: var(--color-surface);
		padding: 0.25rem 0.7rem;
		border-radius: 5px;
		color: var(--color-text-muted);
	}

	.board-area {
		display: flex;
		gap: 1.5rem;
		margin-top: 1.2rem;
	}

	.board-container {
		position: relative;
	}

	.stats-bar {
		margin-top: 1rem;
		display: flex;
		gap: 1.2rem;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		opacity: 0.6;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 300px;
		color: var(--color-text-muted);
		font-size: 1.05rem;
	}

	.error {
		color: #f43f5e;
		font-size: 0.95rem;
		margin-top: 0.5rem;
	}
</style>
