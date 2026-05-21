<script lang="ts">
	import '../app.css';
	import { themeStore } from '$lib/stores/theme.svelte';

	let { children } = $props();

	themeStore.init();
</script>

<main class="h-screen overflow-hidden">
	{@render children()}
</main>
