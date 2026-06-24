<script lang="ts">
	import type { GameState } from '$lib/types/kontab';
	import { kontabNames } from './names.svelte';

	interface Props {
		game: GameState;
		seat: number;
		thinking: boolean;
		position: 'top' | 'left' | 'right';
	}

	let { game, seat, thinking, position }: Props = $props();

	const count = $derived(game.hands[seat].length);
	const active = $derived(game.current === seat && game.phase.kind === 'playing');
	const vertical = $derived(position !== 'top');
	const overlap = $derived(game.num_players >= 3);

	function cardStyle(i: number): string {
		if (vertical) {
			return 'transform: rotate(90deg);' + (overlap && i > 0 ? ' margin-top: -90px;' : '');
		}
		return overlap && i > 0 ? 'margin-left: -36px;' : '';
	}
</script>

<div
	class="seat seat-{position}"
	class:active
	data-testid={`opponent-${seat}`}
>
	<div class="name">
		{kontabNames.label(seat)}
		{#if active && thinking}<span class="dots" data-testid={`opponent-${seat}-thinking`}>misli…</span>{/if}
	</div>
	<div class="fan" class:vertical class:overlap>
		{#each Array(count) as _, i (i)}
			<div class="fcard" style={cardStyle(i)}></div>
		{/each}
		{#if count === 0}<span class="empty">—</span>{/if}
	</div>
</div>

<style>
	.seat {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.4rem 0.6rem;
		border-radius: 10px;
		border: 1px solid transparent;
	}

	.seat.active {
		border-color: var(--color-accent);
		background: var(--color-accent-dim);
	}

	.seat-top {
		top: 0;
		left: 50%;
		transform: translateX(-50%);
	}

	.seat-left {
		left: 0;
		top: 50%;
		transform: translateY(-50%);
	}

	.seat-right {
		right: 0;
		top: 50%;
		transform: translateY(-50%);
	}

	.name {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text-primary);
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.dots {
		font-size: 0.72rem;
		font-weight: 400;
		color: var(--color-accent);
	}

	.fan {
		display: flex;
		align-items: center;
		min-height: 174px;
	}

	.fan.vertical {
		flex-direction: column;
		min-height: auto;
	}

	.fan {
		gap: 0.3rem;
	}

	.fan.overlap {
		gap: 0;
	}

	.fcard {
		width: 120px;
		height: 174px;
		border-radius: 10px;
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

	.empty {
		color: var(--color-text-muted);
		font-size: 1rem;
	}
</style>
