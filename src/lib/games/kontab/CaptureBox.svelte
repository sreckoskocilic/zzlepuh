<script lang="ts">
	import { isRed, rankLabel, type Card } from '$lib/types/kontab';

	let { cards = [] }: { cards?: Card[] } = $props();
</script>

{#if cards.length}
	<div class="cap-box" data-testid="capture-box">
		{#each cards as c, i (i)}
			<span class="cap-r" class:red={isRed(c.suit)}>{rankLabel(c.rank)}</span>
		{/each}
	</div>
{/if}

<style>
	.cap-box {
		display: flex;
		flex-wrap: nowrap;
		justify-content: center;
		align-items: center;
		gap: 0.3rem;
		white-space: nowrap;
		padding: 0.18rem 0.45rem;
		border-radius: 7px;
		background: color-mix(in srgb, var(--color-bg) 80%, transparent);
		border: 1px solid var(--color-border-cell);
		font-size: clamp(12px, 1.7vmin, 16px);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.02em;
		line-height: 1.15;
	}

	.cap-r {
		color: var(--color-text-primary);
	}

	.cap-r.red {
		color: #e06d6d;
	}
</style>
