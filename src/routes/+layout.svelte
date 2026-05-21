<script lang="ts">
	import '../app.css';
	import { themeStore } from '$lib/stores/theme.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children } = $props();

	themeStore.init();
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
