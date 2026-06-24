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
	{#if kontabState.error}
		<p class="error" data-testid="kontab-error">{kontabState.error}</p>
	{/if}

	{#if game}
		<div class="arena" data-testid="kontab-opponents">
			<div class="hud hud-left">
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
			</div>
			<div class="hud hud-right">
				<ScoreBoard {game} />
			</div>

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

			<section class="me">
				<Hand
					cards={sortHand(game.hands[0])}
					enabled={kontabState.isHumanTurn}
					overlap={true}
					onplay={(c) => kontabState.playCard(c)}
					onpreview={(c) => (previewCard = c)}
				/>
			</section>
		</div>

	{/if}

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
		max-width: 1400px;
		height: 100vh;
		margin: 0 auto;
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		overflow: hidden;
	}

	/* HUD overlays inside the arena corners */
	.hud {
		position: absolute;
		top: 0.9rem;
		z-index: 15;
	}

	.hud-left {
		left: 0.9rem;
	}

	.hud-right {
		right: 0.9rem;
	}

	.error {
		color: #e06666;
		font-size: 0.85rem;
	}

	/* ===== Hearts arena: rectangle of 4 hands around the talon ===== */
	.arena {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow: hidden;
		border-radius: 22px;
		display: grid;
		grid-template-columns: auto 1fr auto;
		grid-template-rows: auto 1fr auto;
		grid-template-areas:
			'.    top    .'
			'left center right'
			'.    me     .';
		align-items: center;
		justify-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		/* modern: dark radial glow + accent inner border */
		background: radial-gradient(
			80% 65% at 50% 48%,
			color-mix(in srgb, var(--color-accent) 9%, var(--color-surface)) 0%,
			var(--color-surface) 55%,
			var(--color-bg) 100%
		);
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 18%, transparent),
			inset 0 0 60px rgba(0, 0, 0, 0.45);
	}

	.talon {
		grid-area: center;
		/* talon cards: still fit two rows vertically with hand + top seat */
		--lg-w: clamp(78px, 13vmin, 168px);
		--lg-h: calc(var(--lg-w) * 1.452);
	}

	.me {
		grid-area: me;
		/* my hand: the big, prominent cards */
		--lg-w: clamp(90px, 14vmin, 185px);
		--lg-h: calc(var(--lg-w) * 1.452);
	}

	.capture-flash {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 1rem 1.4rem;
		background: color-mix(in srgb, var(--color-surface-hover) 92%, black);
		border: 2px solid var(--color-accent);
		border-radius: 14px;
		box-shadow:
			0 0 0 1px color-mix(in srgb, var(--color-accent) 30%, transparent),
			0 10px 34px rgba(0, 0, 0, 0.6),
			0 0 50px -10px color-mix(in srgb, var(--color-accent) 50%, transparent);
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
