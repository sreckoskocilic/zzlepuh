<script lang="ts">
	import { kontabNames } from './names.svelte';

	let open = $state(false);

	const fields = [
		{ i: 0, label: 'Ti' },
		{ i: 1, label: 'C1' },
		{ i: 2, label: 'C2' },
		{ i: 3, label: 'C3' }
	];
</script>

<div class="wrap">
	<button
		type="button"
		class="gear"
		title="Imena igrača"
		data-testid="kontab-names-toggle"
		onclick={() => (open = !open)}
	>
		Names
	</button>

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="backdrop" onclick={() => (open = false)} onkeydown={() => {}}></div>
		<div class="panel" data-testid="kontab-names-panel">
			{#each fields as f (f.i)}
				<label>
					<span>{f.label}</span>
					<input
						type="text"
						maxlength="14"
						value={kontabNames.names[f.i]}
						placeholder={f.label}
						data-testid={`name-input-${f.i}`}
						oninput={(e) => kontabNames.set(f.i, e.currentTarget.value)}
					/>
				</label>
			{/each}
		</div>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
		width: 100%;
	}

	.gear {
		background: #2f3d32;
		color: #ffffff;
		border: none;
		border-radius: 6px;
		padding: 0.5rem 1.1rem;
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		line-height: 1.1;
		cursor: pointer;
	}

	.gear:hover {
		filter: brightness(1.15);
	}

	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 45;
	}

	.panel {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.8rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border-cell);
		border-radius: 8px;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
		min-width: 200px;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.82rem;
		color: var(--color-text-muted);
	}

	label span {
		width: 28px;
		flex-shrink: 0;
	}

	input {
		flex: 1;
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-cell);
		border-radius: 5px;
		padding: 0.35rem 0.5rem;
		font-family: inherit;
		font-size: 0.85rem;
	}
</style>
