<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		numPlayers: number;
		target: number;
		busy: boolean;
		onnew: (numPlayers: number, target: number) => void;
		names?: Snippet;
	}

	let { numPlayers, target, busy, onnew, names }: Props = $props();

	let selected = $derived(numPlayers - 1);
	let selectedTarget = $derived(target);
</script>

<div class="grid" data-testid="kontab-controls">
	<div class="col">
		<span class="lbl">Opponents</span>
		<select bind:value={selected} data-testid="kontab-opponent-count" disabled={busy}>
			<option value={1}>1 AI</option>
			<option value={2}>2 AI</option>
			<option value={3}>3 AI</option>
		</select>
		<button
			type="button"
			class="primary"
			data-testid="kontab-new-game"
			disabled={busy}
			onclick={() => onnew(selected + 1, selectedTarget)}
		>
			Start
		</button>
	</div>

	<div class="col">
		<span class="lbl">TO PTS</span>
		<select bind:value={selectedTarget} data-testid="kontab-target" disabled={busy}>
			<option value={51}>51</option>
			<option value={101}>101</option>
		</select>
		{@render names?.()}
	</div>
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: max-content max-content;
		gap: 0.7rem;
		align-items: start;
	}

	.col {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.lbl {
		font-size: 0.78rem;
		color: var(--color-text-muted);
		text-align: center;
	}

	select {
		width: 100%;
		background: var(--color-surface);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-cell);
		border-radius: 6px;
		padding: 0.4rem 0.5rem;
		font-family: inherit;
		font-size: 0.85rem;
	}

	.primary {
		background: #207959;
		color: #e9e1e1;
		border: none;
		border-radius: 6px;
		padding: 0.5rem 1.1rem;
		font-family: inherit;
		font-weight: 600;
		font-size: 0.85rem;
		line-height: 1.1;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.primary:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
