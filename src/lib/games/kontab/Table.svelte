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
		<span class="empty" data-testid="kontab-table-empty">Stol prazan</span>
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
		gap: 0.5rem;
		justify-content: center;
		align-items: center;
		min-height: 132px;
		padding: 1rem;
		border: 1px dashed var(--color-border-cell);
		border-radius: 12px;
		background: var(--color-surface);
	}

	.empty {
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
</style>
