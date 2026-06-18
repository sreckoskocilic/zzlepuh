<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { runSilentUpdate } from '$lib/services/updater';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children } = $props();

	void themeStore.init();

	let updateStatus = $state<string | null>(null);
	let updateError = $state(false);

	onMount(() => {
		void runSilentUpdate((msg) => {
			updateStatus = msg;
			updateError = msg.startsWith('Update greška');
		});
	});
</script>

{#if updateStatus}
	<div class="update-banner" class:err={updateError} role="status">
		{updateStatus}
		{#if updateError}
			<button class="dismiss" onclick={() => (updateStatus = null)}>×</button>
		{/if}
	</div>
{/if}

<div class="app-shell">
	<Sidebar />
	<main class="app-content">
		{@render children()}
	</main>
</div>

<style>
	.app-shell {
		display: flex;
		height: 100vh;
		overflow: hidden;
	}

	.app-content {
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}

	.update-banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		padding: 0.5rem 1rem;
		text-align: center;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-bg, #0a0f0c);
		background: var(--color-accent, #34d399);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
	}

	.update-banner.err {
		color: #fff;
		background: #c0392b;
		font-weight: 500;
	}

	.dismiss {
		margin-left: 0.6rem;
		background: rgba(255, 255, 255, 0.2);
		border: none;
		color: #fff;
		border-radius: 4px;
		cursor: pointer;
		padding: 0 0.4rem;
		font-size: 1rem;
		line-height: 1.2;
	}
</style>
