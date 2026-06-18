<script lang="ts">
	import type { CellState } from '$lib/types/nonogram';

	let {
		grid,
		title,
		elapsedMs,
		onClose,
		onAgain
	}: {
		grid: CellState[][];
		title: string;
		elapsedMs: number;
		onClose: () => void;
		onAgain: () => void;
	} = $props();

	let rows = $derived(grid.length);
	let cols = $derived(grid[0]?.length ?? 0);
	let px = $derived(Math.max(8, Math.min(20, Math.floor(360 / Math.max(rows, cols)))));

	function fmt(ms: number): string {
		const s = Math.floor(ms / 1000);
		return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
	}
</script>

<div class="reveal" data-testid="picture-reveal">
	<div class="card">
		<div class="badge">✓ Riješeno</div>
		<div
			class="art"
			style:grid-template-columns="repeat({cols}, {px}px)"
			style:grid-template-rows="repeat({rows}, {px}px)"
		>
			{#each grid as row, r (r)}
				{#each row as cell, c (c)}
					<div class="px" class:on={cell === 'filled'}></div>
				{/each}
			{/each}
		</div>
		<h2 class="title" data-testid="picture-title">{title}</h2>
		<p class="time">{fmt(elapsedMs)}</p>
		<div class="actions">
			<button class="btn-primary" onclick={onAgain}>Nova slika</button>
			<button class="btn" onclick={onClose}>Zatvori</button>
		</div>
	</div>
</div>

<style>
	.reveal {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(8, 12, 10, 0.82);
		backdrop-filter: blur(2px);
		z-index: 20;
		animation: fade 0.25s ease;
	}
	@keyframes fade { from { opacity: 0; } }

	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 1.4rem 1.8rem;
		background: var(--color-surface, #11160f);
		border: 1px solid var(--color-accent-dim, #1d3b2c);
		border-radius: 12px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
	}

	.badge {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--color-accent, #34d399);
		text-transform: uppercase;
	}

	.art {
		display: grid;
		gap: 0;
		border-radius: 6px;
		overflow: hidden;
		background: #e8e4d8;
		box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4);
		animation: pop 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2);
	}
	@keyframes pop { from { transform: scale(0.85); opacity: 0; } }

	.px { background: transparent; }
	.px.on { background: #1a1c1a; }

	.title {
		margin: 0.2rem 0 0;
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--color-text-primary, #e8efe9);
	}

	.time {
		margin: 0;
		font-variant-numeric: tabular-nums;
		font-size: 0.95rem;
		color: var(--color-text-muted, #8aa499);
	}

	.actions {
		display: flex;
		gap: 0.6rem;
		margin-top: 0.4rem;
	}

	.btn,
	.btn-primary {
		padding: 0.4rem 0.9rem;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 600;
		font-family: inherit;
	}
	.btn-primary {
		background: var(--color-accent, #34d399);
		color: var(--color-bg-primary, #0a0f0c);
	}
	.btn {
		background: var(--color-surface-hover, #1b241c);
		color: var(--color-text-muted, #8aa499);
	}
	.btn:hover,
	.btn-primary:hover { opacity: 0.9; }
</style>
