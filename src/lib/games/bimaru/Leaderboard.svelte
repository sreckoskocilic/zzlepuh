<script lang="ts">
	import type { LeaderboardEntry } from '$lib/types/game';

	let {
		entries,
		highlightRank = null
	}: {
		entries: LeaderboardEntry[];
		highlightRank?: number | null;
	} = $props();

	function formatTime(ms: number): string {
		const secs = Math.floor(ms / 1000);
		const mins = Math.floor(secs / 60);
		return `${String(mins).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
	}

	function formatDate(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}
</script>

<div class="leaderboard">
	<h4>Best Times</h4>
	{#if entries.length === 0}
		<p class="empty">No entries yet</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>#</th>
					<th>Time</th>
					<th>Hints</th>
					<th>Date</th>
				</tr>
			</thead>
			<tbody>
				{#each entries as entry, i (i)}
					<tr class:highlight={i === highlightRank}>
						<td class="rank">{i + 1}</td>
						<td class="time">{formatTime(entry.timeMs)}</td>
						<td class="hints">{entry.hintsUsed}</td>
						<td class="date">{formatDate(entry.date)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.leaderboard {
		margin-top: 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border-cell);
		border-radius: 8px;
		padding: 1rem 1.2rem;
	}

	h4 {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-bottom: 0.7rem;
	}

	.empty {
		color: var(--color-text-muted);
		font-size: 0.85rem;
		opacity: 0.6;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
	}

	th {
		text-align: left;
		color: var(--color-text-muted);
		font-weight: 500;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0 0.4rem 0.4rem;
		border-bottom: 1px solid var(--color-border-cell);
	}

	td {
		padding: 0.3rem 0.4rem;
		color: var(--color-text-primary);
	}

	.rank {
		color: var(--color-text-muted);
		width: 1.5rem;
	}

	.time {
		font-weight: 600;
	}

	.hints, .date {
		color: var(--color-text-muted);
	}

	.highlight td {
		color: var(--color-accent);
	}

	.highlight .rank,
	.highlight .hints,
	.highlight .date {
		color: var(--color-accent);
		opacity: 0.8;
	}
</style>
