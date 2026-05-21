<script lang="ts">
	import { themeStore, THEMES } from '$lib/stores/theme.svelte';

	let open = $state(false);

	let currentTheme = $derived(THEMES.find((t) => t.id === themeStore.current)!);

	function pick(id: (typeof THEMES)[number]['id']) {
		themeStore.set(id);
		open = false;
	}
</script>

<div class="theme-wrap">
	<button class="trigger" onclick={() => (open = !open)}>
		<span class="swatch" style:background={currentTheme.swatch}></span>
		<span class="label">{currentTheme.label}</span>
		<svg class="chevron" class:open width="10" height="10" viewBox="0 0 10 10">
			<path d="M2.5 4 L5 6.5 L7.5 4" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" />
		</svg>
	</button>

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="backdrop" onclick={() => (open = false)} onkeydown={() => {}}></div>
		<div class="dropdown">
			{#each THEMES as theme (theme.id)}
				<button
					class="option"
					class:active={themeStore.current === theme.id}
					onclick={() => pick(theme.id)}
				>
					<span class="swatch" style:background={theme.swatch}></span>
					{theme.label}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.theme-wrap {
		position: relative;
	}

	.trigger {
		background: none;
		border: 1px solid var(--color-border-cell);
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 5px;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		font-family: inherit;
		transition: color 0.15s, border-color 0.15s;
	}

	.trigger:hover {
		color: var(--color-accent);
		border-color: var(--color-accent-dim);
	}

	.label {
		line-height: 1;
	}

	.chevron {
		transition: transform 0.15s;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
	}

	.dropdown {
		position: absolute;
		right: 0;
		top: calc(100% + 6px);
		background: var(--color-surface);
		border: 1px solid var(--color-border-cell);
		border-radius: 8px;
		padding: 0.35rem;
		z-index: 50;
		min-width: 140px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
	}

	.option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.4rem 0.6rem;
		background: none;
		border: none;
		border-radius: 5px;
		color: var(--color-text-primary);
		font-size: 0.85rem;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.1s;
	}

	.option:hover {
		background: var(--color-surface-hover);
	}

	.option.active {
		color: var(--color-accent);
	}

	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}
</style>
