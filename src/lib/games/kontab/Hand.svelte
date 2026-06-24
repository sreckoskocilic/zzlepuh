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
		flex-wrap: wrap;
		gap: 0.6rem;
		justify-content: center;
		padding: 0.5rem;
		min-height: 184px;
	}

	.hand.overlap {
		flex-wrap: nowrap;
		gap: 0;
	}

	.hand.overlap > :global(* + *) {
		margin-left: -36px;
	}
</style>
