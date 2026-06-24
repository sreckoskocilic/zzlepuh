<script lang="ts">
	import type { Card, GameState } from '$lib/types/kontab';
	import { kontabNames } from './names.svelte';
	import CaptureBox from './CaptureBox.svelte';

	interface Props {
		game: GameState;
		seat: number;
		thinking: boolean;
		position: 'top' | 'left' | 'right';
		captured?: Card[];
	}

	let { game, seat, thinking, position, captured = [] }: Props = $props();

	const MAX_SLOTS = 6;

	const count = $derived(game.hands[seat].length);
	const active = $derived(game.current === seat && game.phase.kind === 'playing');
	const vertical = $derived(position !== 'top');

	// Fixed-width fan: removed cards drop from the outer edges, alternating
	// left then right, so surviving backs keep their slot and never shuffle.
	const removed = $derived(Math.max(0, MAX_SLOTS - count));
	const leftGone = $derived(Math.ceil(removed / 2));
	const rightGone = $derived(Math.floor(removed / 2));
	const slots = $derived(
		Array.from({ length: MAX_SLOTS }, (_, i) => i >= leftGone && i < MAX_SLOTS - rightGone)
	);
</script>

<div class="seat seat-{position}" class:active data-testid={`opponent-${seat}`}>
	<div class="plate" class:active>
		<span class="nm">{kontabNames.label(seat)}</span>
		<span class="cnt" data-testid={`opponent-${seat}-count`}>{count}</span>
		{#if active && thinking}
			<span class="lbl" data-testid={`opponent-${seat}-thinking`}>misli…</span>
		{/if}
	</div>
	<div class="fan" class:vertical>
		{#each slots as filled, i (i)}
			<div class="fcard" class:ghost={!filled}></div>
		{/each}
		{#if count === 0}<span class="empty">—</span>{/if}
	</div>
	<div class="capwrap cap-{position}">
		<CaptureBox cards={captured} />
	</div>
</div>

<style>
	.seat {
		position: relative;
		/* card-back size, scales with window */
		--opp-w: clamp(52px, 9vmin, 124px);
		--opp-h: calc(var(--opp-w) * 1.452);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5vmin;
	}

	/* absolute so the box never resizes the seat / side grid column (avoids
	   drifting the whole center column) */
	.capwrap {
		position: absolute;
		z-index: 12;
		pointer-events: none;
	}

	/* side seats: box below */
	.cap-left,
	.cap-right {
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-top: 0.35rem;
	}

	/* top seat: box beside (to the right) */
	.cap-top {
		left: 100%;
		top: 50%;
		transform: translateY(-50%);
		margin-left: 0.6rem;
	}

	.seat-top {
		grid-area: top;
	}
	.seat-left {
		grid-area: left;
	}
	.seat-right {
		grid-area: right;
	}

	/* nameplate: name + BIG card-count, above the hand */
	.plate {
		position: relative;
		display: inline-flex;
		align-items: baseline;
		gap: 0.6rem;
		padding: 0.4rem 0.9rem;
		border-radius: 12px;
		background: color-mix(in srgb, var(--color-bg) 55%, transparent);
		border: 1px solid var(--color-border-cell);
		white-space: nowrap;
	}

	.plate.active {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		box-shadow: 0 0 18px -4px color-mix(in srgb, var(--color-accent) 55%, transparent);
	}

	.nm {
		font-size: clamp(14px, 2.1vmin, 22px);
		font-weight: 400;
		color: #bdc4bd;
		letter-spacing: 0.03em;
	}

	.plate.active .nm {
		color: var(--color-accent);
	}

	.cnt {
		font-size: clamp(16px, 2.4vmin, 27px);
		font-weight: 400;
		line-height: 1;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
	}

	/* absolute so toggling 'misli…' never resizes the plate (which would resize
	   the side grid column and drift the whole center column) */
	.lbl {
		position: absolute;
		top: calc(100% + 2px);
		left: 50%;
		transform: translateX(-50%);
		font-size: clamp(11px, 1.6vmin, 15px);
		color: var(--color-accent);
		white-space: nowrap;
	}

	.fan {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.fan.vertical {
		flex-direction: column;
	}

	/* overlap matches the side seats' spacing */
	.fan > * + * {
		margin-left: calc(var(--opp-w) * -0.5);
	}

	/* side seats: landscape (rotated) backs stacked vertically */
	.fan.vertical .fcard {
		width: var(--opp-h);
		height: var(--opp-w);
	}

	.fan.vertical > * + * {
		margin-left: 0;
		margin-top: calc(var(--opp-w) * -0.5);
	}

	/* solid patterned card-back (like the committed version) — reads as a real
	   stack, not faint ghosts */
	.fcard {
		width: var(--opp-w);
		height: var(--opp-h);
		border-radius: 8px;
		flex-shrink: 0;
		border: 2px solid #f3f2ec;
		background:
			repeating-linear-gradient(
				45deg,
				rgba(255, 255, 255, 0.14),
				rgba(255, 255, 255, 0.14) 4px,
				transparent 4px,
				transparent 9px
			),
			linear-gradient(135deg, #2f5aa8, #1d3a73);
		box-shadow:
			inset 0 0 0 3px rgba(255, 255, 255, 0.18),
			0 1px 3px rgba(0, 0, 0, 0.5);
	}

	.ghost {
		visibility: hidden;
	}

	.empty {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: var(--color-text-muted);
		font-size: 1rem;
	}
</style>
