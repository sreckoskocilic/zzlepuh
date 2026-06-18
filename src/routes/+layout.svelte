<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { runSilentUpdate } from '$lib/services/updater';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children } = $props();

	void themeStore.init();

	onMount(() => {
		void runSilentUpdate();
	});
</script>

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

</style>
