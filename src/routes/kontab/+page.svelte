<script lang="ts">
	import { onMount } from 'svelte';
	import { kontabState } from '$lib/games/kontab/state.svelte';
	import { kontabNames } from '$lib/games/kontab/names.svelte';
	import { cardKey, sortHand, type Card } from '$lib/types/kontab';
	import CardView from '$lib/games/kontab/Card.svelte';
	import Controls from '$lib/games/kontab/Controls.svelte';
	import NameSettings from '$lib/games/kontab/NameSettings.svelte';
	import OpponentSeat from '$lib/games/kontab/OpponentSeat.svelte';
	import ScoreBoard from '$lib/games/kontab/ScoreBoard.svelte';
	import Table from '$lib/games/kontab/Table.svelte';
	import Hand from '$lib/games/kontab/Hand.svelte';
	import DealSummary from '$lib/games/kontab/DealSummary.svelte';
	import GameOver from '$lib/games/kontab/GameOver.svelte';

	let previewCard = $state<Card | null>(null);

	const game = $derived(kontabState.game);

	const OPP_POS: Record<number, ('top' | 'left' | 'right')[]> = {
		1: ['top'],
		2: ['left', 'right'],
		3: ['left', 'top', 'right']
	};
	const seatPositions = $derived(OPP_POS[(game?.num_players ?? 2) - 1] ?? ['top']);

	const previewCaptured = $derived.by(() => {
		if (!previewCard || !kontabState.isHumanTurn) return [];
		return kontabState.moveFor(previewCard)?.captures.flat() ?? [];
	});

	const lastCaptured = $derived(kontabState.lastEvent?.captured ?? []);
	const tableHighlight = $derived(previewCaptured.length ? previewCaptured : lastCaptured);
	const flash = $derived(kontabState.capturedFlash);

	onMount(() => {
		kontabNames.load();
		if (!kontabState.game) void kontabState.newGame();
	});
</script>

<div class="page" data-testid="kontab-page">
	<header>
		<Controls
			numPlayers={kontabState.numPlayers}
			target={kontabState.target}
			busy={kontabState.busy}
			onnew={(n, t) => kontabState.newGame(n, t)}
		>
			{#snippet names()}
				<NameSettings />
			{/snippet}
		</Controls>
		{#if game}
			<div class="score-head">
				<ScoreBoard {game} />
			</div>
		{/if}
	</header>

	{#if kontabState.error}
		<p class="error" data-testid="kontab-error">{kontabState.error}</p>
	{/if}

	{#if game}
		<div class="body">
			<div class="main">
				<div class="arena" data-testid="kontab-opponents">
					{#each Array.from({ length: game.num_players - 1 }, (_, i) => i + 1) as seat (seat)}
						<OpponentSeat
							{game}
							{seat}
							thinking={kontabState.thinking}
							position={seatPositions[seat - 1] ?? 'top'}
						/>
					{/each}

					<div class="talon">
						<Table cards={game.table} highlighted={tableHighlight} />
					</div>

					{#if flash}
						<div class="capture-flash" data-testid="kontab-capture">
							<span class="cap-who">{kontabNames.label(flash.player)} nosi</span>
							<div class="cap-cards">
								<CardView card={flash.card} size="lg" />
								{#each flash.captured as c (cardKey(c))}
									<CardView card={c} size="lg" />
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<section class="me">
					<Hand
						cards={sortHand(game.hands[0])}
						enabled={kontabState.isHumanTurn}
						overlap={game.num_players >= 3}
						onplay={(c) => kontabState.playCard(c)}
						onpreview={(c) => (previewCard = c)}
					/>
				</section>
			</div>
		</div>

	{/if}

	{#if kontabState.lastEvent?.is_tabla}
		<div class="tabla-flash" data-testid="kontab-tabla">Tabla! +10</div>
	{/if}
</div>

{#if game && kontabState.showDealSummary}
	<DealSummary
		{game}
		breakdown={kontabState.dealSummary?.deal_breakdown ?? null}
		oncontinue={() => kontabState.continueDeal()}
	/>
{/if}

{#if game && game.phase.kind === 'game_over'}
	<GameOver {game} loser={game.phase.loser} onnew={() => kontabState.newGame()} />
{/if}

<style>
	.page {
		max-width: 1200px;
		min-height: 100vh;
		margin: 0 auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	header {
		display: flex;
		align-items: flex-start;
		justify-content: flex-start;
		gap: 0.8rem;
		flex-wrap: wrap;
		padding-left: 80px;
	}


	.error {
		color: #e06666;
		font-size: 0.85rem;
	}

	.body {
		display: flex;
		gap: 1rem;
		flex: 1;
		align-items: stretch;
	}

	.main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.arena {
		position: relative;
		flex: 1;
		min-height: 560px;
	}

	.capture-flash {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 1rem 1.4rem;
		background: var(--color-surface-hover);
		border: 2px solid var(--color-accent);
		border-radius: 14px;
		box-shadow: 0 6px 22px rgba(0, 0, 0, 0.55);
		z-index: 20;
	}

	.cap-who {
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--color-accent);
	}

	.cap-cards {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.45rem;
		max-width: min(94vw, 980px);
	}

	.talon {
		position: absolute;
		top: 280px;
		left: 50%;
		transform: translateX(-50%);
		width: min(64%, 640px);
	}

	.score-head {
		margin-left: auto;
		margin-right: 120px;
	}

	.me {
		margin-top: auto;
	}

	.tabla-flash {
		position: fixed;
		top: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		background: var(--color-accent);
		color: var(--color-bg);
		font-weight: 700;
		padding: 0.4rem 1rem;
		border-radius: 8px;
		z-index: 70;
	}
</style>
