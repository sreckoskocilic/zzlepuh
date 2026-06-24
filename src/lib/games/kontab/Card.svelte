<script lang="ts">
	import { cardImage, rankLabel, SUIT_SYMBOL, type Card } from '$lib/types/kontab';

	interface Props {
		card?: Card;
		faceDown?: boolean;
		selected?: boolean;
		highlight?: boolean;
		dim?: boolean;
		size?: 'sm' | 'md' | 'lg';
		onclick?: () => void;
		onpointerenter?: () => void;
		onpointerleave?: () => void;
		testid?: string;
	}

	let {
		card,
		faceDown = false,
		selected = false,
		highlight = false,
		dim = false,
		size = 'md',
		onclick,
		onpointerenter,
		onpointerleave,
		testid
	}: Props = $props();

	const src = $derived(card ? cardImage(card) : '');
	const alt = $derived(card ? `${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}` : '');
</script>

<button
	type="button"
	class="card {size}"
	class:face-down={faceDown}
	class:selected
	class:highlight
	class:dim
	class:clickable={!!onclick}
	disabled={!onclick}
	{onclick}
	{onpointerenter}
	{onpointerleave}
	data-testid={testid}
>
	{#if !faceDown && card}
		<img {src} {alt} draggable="false" />
	{/if}
</button>

<style>
	.card {
		position: relative;
		display: block;
		background: transparent;
		border: none;
		border-radius: 8px;
		padding: 0;
		cursor: default;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
		transition:
			transform 0.12s,
			box-shadow 0.12s,
			border-color 0.12s,
			opacity 0.12s;
	}

	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		/* kill stark white on photo cards -> warm cream, less glare on dark bg */
		filter: brightness(0.93) saturate(1.06) sepia(0.16);
	}

	/* lg is the in-play size; parent context can override via --lg-w/--lg-h
	   (hand vs talon scale differently). Defaults keep capture-flash etc. fixed. */
	.card.lg {
		width: var(--lg-w, 120px);
		height: var(--lg-h, 174px);
		border-radius: 10px;
	}

	.card.md {
		width: 92px;
		height: 134px;
	}

	.card.sm {
		width: 48px;
		height: 70px;
	}

	.card.clickable {
		cursor: pointer;
	}

	.card.clickable:hover {
		transform: translateY(-8px);
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.4);
		z-index: 10;
	}

	.card.selected {
		transform: translateY(-10px);
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px var(--color-accent);
		z-index: 10;
	}

	.card.highlight img {
		filter: brightness(0.5) saturate(1.06) sepia(0.16);
	}

	.card.dim {
		opacity: 0.45;
	}

	.card.face-down {
		background: repeating-linear-gradient(
			45deg,
			var(--color-accent-dim),
			var(--color-accent-dim) 6px,
			var(--color-bg-secondary) 6px,
			var(--color-bg-secondary) 12px
		);
		border-color: var(--color-border-cell);
	}
</style>
