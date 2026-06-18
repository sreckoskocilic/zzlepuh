# Persistence / Performance Audit — ln-650 Final Report

**Project:** Zzlepuh (Tauri v2 + SvelteKit + Svelte 5 desktop puzzle game)
**Run:** persistence-audit-20260618
**Workers run:** ln-653 (runtime-performance), ln-654 (resource-lifecycle)
**Skipped:** ln-651 (query-efficiency — no DB/queries; persistence is a trivial KV JSON store), ln-652 (transaction-correctness — no transactions; the write-queue serialization is already audited and tested)

## Executive Summary

No database, no ORM, no pools, no transactions — persistence is `@tauri-apps/plugin-store` writing a small per-key JSON blob. At grid sizes 4×4–25×25 with retry caps + 5s solver deadlines and KB-scale save files, this surface is **largely perf-irrelevant**, which the audit confirms: the classic "clone whole state per backtracking branch" allocations, propagate snapshots, and frontend reactive recomputes are all genuinely size-bounded and not user-perceivable.

Two concrete, low-to-medium findings:
1. **Five solver-invoking commands run inline instead of on `spawn_blocking`** — a worst-case 5s solve can tie up a Tauri runtime worker thread. Inconsistent with `generate_*` and `check_bimaru_errors`, which already use `spawn_blocking`.
2. **`errorTimeout` (2500ms) isn't cancelled on route leave** — the game-state singletons outlive the route, so a pending error-clear can fire on the detached singleton. Already harmless (gameId/grid guards make it safe), just a cleanup gap.

**Verdict:** Healthy. Item 1 is the only fix with real (if rare) value and it aligns with the existing pattern. Item 2 is cosmetic tidiness. Everything else is correctly perf-irrelevant.

## Prioritized Remediation Plan

### P1 — Move the remaining solver commands onto `spawn_blocking` (LOW-MED)
These run a backtracking solver with a 5s deadline directly as synchronous `#[tauri::command] pub fn`, on a Tauri runtime worker thread:
- `commands/nonogram.rs::check_nonogram_errors`, `get_nonogram_hint`
- `commands/calcudoku.rs::check_calcudoku_errors`, `get_calcudoku_hint`
- `commands/bimaru.rs::get_bimaru_hint`

`generate_*` and `check_bimaru_errors` already wrap their CPU work in `tauri::async_runtime::spawn_blocking`. The frontend already `await`s all of these (TS service wrappers are async), so converting the Rust commands to `async` + `spawn_blocking` is **transparent to the frontend**. `validate_*` are O(n²) (`is_valid_solution`, no backtracking) — leave them sync.
- Risk: low (mechanical, mirrors existing commands). Acceptance: Rust tests green; commands `async`; worst-case solve can't hold a worker thread.
- Note: CLAUDE.md labels these "(sync)" — update the doc line if pursued.
- Source: ln-653 (MEDIUM).

### P2 — Cancel `errorTimeout` on route leave (LOW, optional)
The game-state singletons (`export const bimaruState = ...`) are module-level and survive route changes; a pending 2500ms `errorTimeout` from `requestCheck` is cleared only on the next new-game/check, not on `onDestroy`. Leaving the route mid-check-window lets it fire on the detached singleton.
- Today's gameId-snapshot + `gridUnchanged` guards make this a **safe no-op** (it writes `errorCells` that get re-read on remount), so this is tidiness, not a leak. Add a `cancelPendingTimers()` method (clears `errorTimeout`) and call it from each page's `onDestroy` alongside `timer.pause()`.
- Source: ln-654 (MED severity, but harmless given existing guards).

## Clean Areas (no action — verified)
- **Solver/generator allocations** (grid/domain clone per branch, propagate snapshots, `find_best_unknown` rescans, coord-Vec allocs): real "waste" but trivial at ≤25×25/≤9×9 and capped by the 200ms/5s deadlines. Mutate-and-restore would cut allocs but isn't worth the bug risk. ln-653 (all marked "ignore — size-bounded").
- **Frontend hot paths**: `checkWin` grid snapshot fires only near-win (not per click); `errorCells` Set tiny; `cellSize`/clue-satisfaction `$derived` are O(rows·cols) at ≤625 cells with Svelte 5 fine-grained reactivity. No jank. ln-653.
- **Persistence**: per-key blobs (`stats:<game>`, `leaderboard:<game>:<diff>:<size>`), `$state.snapshot` write (avoids DataCloneError), per-key `writeQueue` serialization, user-paced writes. No full-blob re-serialization problem. ln-653.
- **Timer interval**: single singleton, double-start guard, `clearInterval` always paired, `onDestroy(timer.pause)` per route. No path leaves it running. ln-654.
- **Store handle**: `getStore()` memoizes the load promise — loaded once, reused for app lifetime. No re-load/handle leak. ln-654.
- **Queue/pending Maps**: keyed by bounded game×difficulty×size; entries overwritten in place (last-promise-wins), `pending` self-deletes its key on load. No unbounded growth. ln-654.
- **Flags**: `isHinting`/`isValidating` reset in `finally` on every path (success/throw/early-return); `checkSeq` monotonic. No stuck-true flag. ln-654.
- **Window listeners / updater**: `<svelte:window>` auto-removed on destroy; updater registers no listeners (awaits and returns). ln-654.
- **`checkWin` setTimeout(0) / `winTimeout`**: not cancelled on route leave but guarded safe (gameId + gridUnchanged); `winTimeout` self-nulls. No stale mutation. ln-654.

## Open Questions
- None.

## Cleanup Note
No temporary worker markdown reports written (workers returned inline); nothing to remove. Sole durable report.
