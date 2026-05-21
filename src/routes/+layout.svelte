<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="flex h-screen flex-col">
	<nav class="flex items-center justify-between border-b border-border-cell px-5 py-3">
		<a href="/" class="text-lg font-bold text-accent">Zzlepuh</a>
		<div class="flex gap-4 text-sm text-text-muted">
			<a href="/bimaru" class="transition-colors hover:text-accent">Bimaru</a>
		</div>
	</nav>
	<main class="flex-1 overflow-auto">
		{@render children()}
	</main>
</div>
