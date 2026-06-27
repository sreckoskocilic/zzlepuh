<script lang="ts">
	import { cardKey, type Card } from '$lib/types/kontab';
	import CardView from './Card.svelte';

	interface Props {
		cards: Card[];
		highlighted?: Card[];
	}

	let { cards, highlighted = [] }: Props = $props();

	const highlightKeys = $derived(new Set(highlighted.map(cardKey)));
</script>

<div class="table" data-testid="kontab-table">
	{#if cards.length === 0}
		<span class="empty" data-testid="kontab-table-empty">Table empty</span>
	{:else}
		{#each cards as card (cardKey(card))}
			<CardView {card} size="lg" highlight={highlightKeys.has(cardKey(card))} testid={`table-${cardKey(card)}`} />
		{/each}
	{/if}
</div>

<style>
	.table {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6vmin;
		justify-content: center;
		align-content: center;
		align-items: center;
		/* up to 6 cards per row -> two rows hold a full 12-card talon */
		max-width: calc(var(--lg-w, 120px) * 6 + 6 * 0.6vmin);
		/* same as max-width: a constant box so adding/removing table cards never
		   resizes the center column (keeps hand + seats from drifting) */
		min-width: calc(var(--lg-w, 120px) * 6 + 6 * 0.6vmin);
		min-height: calc(var(--lg-h, 174px) * 0.7);
		margin: 0 auto;
		padding: 1vmin;
		border-radius: 14px;
		background: color-mix(in srgb, var(--color-bg) 45%, transparent);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 10%, transparent);
	}

	.empty {
		color: var(--color-text-muted);
		font-size: 0.95rem;
		opacity: 0.8;
	}
</style>
