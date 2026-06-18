<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getVersion } from '@tauri-apps/api/app';
	import { themeStore, THEMES } from '$lib/stores/theme.svelte';

	let showThemes = $state(false);
	let pathname = $derived($page.url.pathname);
	let version = $state('');

	onMount(async () => {
		try {
			version = await getVersion();
		} catch {
			/* not in Tauri */
		}
	});

	const games = [
		{ id: 'bimaru', name: 'Bimaru', route: '/bimaru' },
		{ id: 'nonogram', name: 'Nonogram', route: '/nonogram' },
		{ id: 'calcudoku', name: 'Calcudoku', route: '/calcudoku' }
	];
</script>

<nav class="sidebar">
	<a href="/" class="logo" class:active={pathname === '/'} title="Home">
		<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
			<rect x="2" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.9" />
			<rect x="13" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
			<rect x="2" y="13" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
			<rect x="13" y="13" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.7" />
		</svg>
	</a>

	<div class="nav-games">
		{#each games as game (game.id)}
			<a
				href={game.route}
				class="nav-item"
				class:active={pathname.startsWith(game.route)}
				title={game.name}
			>
				{#if game.id === 'bimaru'}
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<circle cx="10" cy="5" r="2.5" fill="currentColor" />
						<rect x="3" y="10" width="5" height="2.5" rx="1.25" fill="currentColor" />
						<rect x="12" y="13" width="5" height="2.5" rx="1.25" fill="currentColor" />
						<rect x="5" y="16" width="8" height="2.5" rx="1.25" fill="currentColor" />
					</svg>
				{:else if game.id === 'nonogram'}
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<rect x="2" y="2" width="4.5" height="4.5" rx="0.5" fill="currentColor" />
						<rect x="7.75" y="2" width="4.5" height="4.5" rx="0.5" fill="currentColor" opacity="0.25" />
						<rect x="13.5" y="2" width="4.5" height="4.5" rx="0.5" fill="currentColor" />
						<rect x="2" y="7.75" width="4.5" height="4.5" rx="0.5" fill="currentColor" opacity="0.25" />
						<rect x="7.75" y="7.75" width="4.5" height="4.5" rx="0.5" fill="currentColor" />
						<rect x="13.5" y="7.75" width="4.5" height="4.5" rx="0.5" fill="currentColor" opacity="0.25" />
						<rect x="2" y="13.5" width="4.5" height="4.5" rx="0.5" fill="currentColor" />
						<rect x="7.75" y="13.5" width="4.5" height="4.5" rx="0.5" fill="currentColor" opacity="0.25" />
						<rect x="13.5" y="13.5" width="4.5" height="4.5" rx="0.5" fill="currentColor" />
					</svg>
				{:else if game.id === 'calcudoku'}
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<rect x="2" y="2" width="16" height="16" rx="1" stroke="currentColor" stroke-width="1.5"/>
						<line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" stroke-width="1.5"/>
						<line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" stroke-width="1.5"/>
						<path d="M4.5 6h3M6 4.5v3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
						<path d="M13 6h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
						<path d="M4.5 15l3-3M4.5 12l3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
						<circle cx="14.5" cy="12.8" r="0.6" fill="currentColor"/>
						<path d="M13 14h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
						<circle cx="14.5" cy="15.2" r="0.6" fill="currentColor"/>
					</svg>
				{/if}
				<span class="nav-label">{game.name}</span>
			</a>
		{/each}
	</div>

	<div class="nav-bottom">
		<div class="theme-wrap">
			<button class="nav-item" onclick={() => (showThemes = !showThemes)} title="Theme">
				<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
					<circle cx="9" cy="9" r="3" stroke="currentColor" stroke-width="1.4" />
					<path
						d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.4 3.4l1.4 1.4M13.2 13.2l1.4 1.4M3.4 14.6l1.4-1.4M13.2 4.8l1.4-1.4"
						stroke="currentColor"
						stroke-width="1.3"
						stroke-linecap="round"
					/>
				</svg>
			</button>
			{#if showThemes}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="theme-backdrop" onclick={() => (showThemes = false)} onkeydown={() => {}}></div>
				<div class="theme-dropdown">
					{#each THEMES as theme (theme.id)}
						<button
							class="theme-option"
							class:active={themeStore.current === theme.id}
							onclick={() => { themeStore.set(theme.id); showThemes = false; }}
						>
							<span class="swatch" style:background={theme.swatch}></span>
							{theme.label}
						</button>
					{/each}
				</div>
			{/if}
		</div>
		{#if version}
			<span class="version" title="Verzija">v{version}</span>
		{/if}
	</div>
</nav>

<style>
	.sidebar {
		width: 78px;
		height: 100vh;
		background: var(--color-bg-secondary);
		border-right: 1px solid var(--color-border-cell);
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.6rem 0;
		flex-shrink: 0;
	}

	.logo {
		color: var(--color-accent);
		padding: 0.5rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		text-decoration: none;
		transition: background 0.15s;
	}

	.version {
		display: block;
		width: 100%;
		margin-top: 0.5rem;
		text-align: center;
		font-size: 0.85rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
		opacity: 0.9;
	}

	.logo:hover {
		background: var(--color-surface-hover);
	}

	.logo.active {
		background: var(--color-accent-dim);
	}

	.nav-games {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		width: 100%;
		padding: 0 0.4rem;
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.45rem 0.25rem;
		border-radius: 8px;
		color: var(--color-text-muted);
		text-decoration: none;
		cursor: pointer;
		transition: color 0.15s, background 0.15s;
		background: none;
		border: none;
		font-family: inherit;
		width: 100%;
	}

	.nav-item:hover {
		color: var(--color-text-primary);
		background: var(--color-surface-hover);
	}

	.nav-item.active {
		color: var(--color-accent);
		background: var(--color-accent-dim);
	}

	.nav-label {
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		white-space: nowrap;
	}

	.nav-bottom {
		margin-top: auto;
		width: 100%;
		padding: 0 0.4rem;
	}

	.theme-wrap {
		position: relative;
	}

	.theme-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
	}

	.theme-dropdown {
		position: absolute;
		left: calc(100% + 8px);
		bottom: 0;
		background: var(--color-surface);
		border: 1px solid var(--color-border-cell);
		border-radius: 8px;
		padding: 0.35rem;
		z-index: 50;
		min-width: 130px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
	}

	.theme-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.4rem 0.6rem;
		background: none;
		border: none;
		border-radius: 5px;
		color: var(--color-text-primary);
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.1s;
	}

	.theme-option:hover {
		background: var(--color-surface-hover);
	}

	.theme-option.active {
		color: var(--color-accent);
	}

	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}
</style>
