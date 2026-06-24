<script lang="ts">
	import { cardKey, type Card } from '$lib/types/kontab';
	import CardView from './Card.svelte';

	interface Props {
		cards: Card[];
		enabled: boolean;
		overlap?: boolean;
		onplay: (card: Card) => void;
		onpreview?: (card: Card | null) => void;
	}

	let { cards, enabled, overlap = false, onplay, onpreview }: Props = $props();
</script>

<div class="hand" class:overlap data-testid="kontab-hand">
	{#each cards as card (cardKey(card))}
		<CardView
			{card}
			size="lg"
			onclick={enabled ? () => onplay(card) : undefined}
			onpointerenter={() => onpreview?.(card)}
			onpointerleave={() => onpreview?.(null)}
			testid={`hand-${cardKey(card)}`}
		/>
	{/each}
</div>

<style>
	.hand {
		display: flex;
		flex-wrap: nowrap;
		gap: 0;
		justify-content: center;
		align-items: flex-end;
		padding: 0.25rem;
		/* lock the box to a full 6-card span so playing a card recenters the
		   cards inside without resizing the column (keeps talon + seats still) */
		min-width: calc(var(--lg-w, 120px) * 4.9);
	}

	/* flat parallel row, ~22% overlap, scales with --lg-w from parent context */
	.hand > :global(* + *) {
		margin-left: calc(var(--lg-w, 120px) * -0.22);
	}

	.hand :global(.card.clickable:hover) {
		transform: translateY(-22px) scale(1.04);
		z-index: 20;
	}
</style>
