# Test Audit — ln-630 Final Report

**Project:** Zzlepuh (Tauri v2 + SvelteKit + Svelte 5 puzzle game)
**Run:** test-audit-20260618
**Surfaces:** 108 Rust unit, 23 vitest (5 files), 74 Playwright E2E (3 specs + mocked backend)
**Workers run:** ln-631 (business-logic), ln-632 (e2e-priority), ln-633 (value/prune), ln-634 (coverage), ln-635 (isolation), ln-638 (oracle)
**Skipped:** ln-636 (no manual tests), ln-637 (tiny co-located flat suite — folded into ln-633)

## Executive Summary

Suite is healthy and product-focused: no framework/stdlib/tautological tests; Rust engine + command layers are strongly covered (solvers, generators, uniqueness, validation, error-coords, hint, picture filtering, JSON round-trip); vitest stores are well-isolated (`freshGame()` + `store.clear()`, no retry-masking); E2E covers win/check/hint/undo-redo across all 3 games. **No test currently produces a false green of concern.**

Three real weaknesses, in priority order:
1. **The frontend concurrency guards added this session have ZERO coverage** — the exact logic where a bug is user-visible/data-corrupting.
2. **Generator oracles are weak at all sizes but one** — strong invariant checks (clue-match, uniqueness, cage/Latin validity) run on a single size×difficulty per game; every other size is guarded by `is_some()` alone. Same tests are also the only RNG-flake risk and the main redundancy.
3. **E2E gaps**: picture mode (entirely unmocked+untested), loss-on-abandon, leaderboard ranking/display; plus ~9 redundant selector/timer smoke tests.

**Verdict:** Solid suite. The one gap worth fixing now is the concurrency-guard unit tests (P1). The rest is quality polish.

## Prioritized Remediation Plan

### P1 — Add concurrency-guard unit tests (HIGH, zero current coverage)
The session's two bug fixes + the existing CDP win-guard are untested at every layer. One vitest per game (or one shared parametrized suite) covering:
- `requestCheck` stale-seq: mock check to resolve out-of-order (slow first, fast second) → `errorCells` reflects only the latest call.
- `requestHint` in-flight: two `requestHint()` without await → 2nd returns false; and resolve a hint after its target cell was filled → grid unchanged, returns false.
- `checkWin` stale-game/grid-unchanged: fill grid, then `startNewGame()`/mutate before validate resolves → `isComplete` stays false despite `validate` returning true.
- Port the existing `calcudoku/state.test.ts` win-detection pattern to **bimaru** (full-grid trigger) and **nonogram** (filledCount-vs-`expectedFilled` threshold — distinct logic, untested).

Source: ln-634 (HIGH ×3), ln-632. Acceptance: each guard has a red-on-revert test.

### P2 — Strengthen + consolidate + seed the generator size-sweep (resolves 3 findings at once)
For each game, the per-size `assert!(is_some())` tests (bimaru 8×8/12×12/6×6/hard, nonogram 5×5/15×15/20×20, calcudoku 4×4-med/hard/5×5/7×7/8×8/9×9) should become **one parametrized test over the sizes/difficulties** that asserts the existing strong invariants — clue round-trip, no-adjacent-ships (bimaru), `has_unique_solution`, cage-op-matches-values + Latin validity (calcudoku) — using a **seeded RNG** (`StdRng::seed_from_u64`) for determinism.
- Resolves ln-633 (deletes the redundant smoke bodies), ln-638 (adds the missing strong oracle to every size), and ln-635 (eliminates the unseeded-RNG attempt-exhaustion flake at 9×9/20×20).
- **Conflict resolution:** ln-633 wanted DELETE, ln-638 wanted STRENGTHEN, ln-635 wanted SEED — all three are satisfied by consolidate-and-strengthen rather than plain deletion (deletion alone would lose size coverage). Requires the generators' `generate` fns to accept an optional seeded RNG in tests (or a test-only seeded entry point).

### P3 — Close E2E journey gaps (MEDIUM)
- **Picture mode** (biggest gap): add `list_nonogram_pictures` + `generate_nonogram_picture` handlers to `tauri-mock.ts`, then test picker → `startPictureGame` → `PictureReveal` overlay, incl. the stats/leaderboard-exclusion branch (zero E2E today).
- **Loss-on-abandon**: start game, move, New Game → assert stats book a loss + streak reset (guards `isValidatingSolution`/`isPicture` branches).
- **Leaderboard ranking/display**: win → assert rank in WinOverlay; toggle Leaderboard panel → assert entry row. One nonogram test covers the shared `leaderboardStore`/`Leaderboard.svelte` wiring.
- Source: ln-632.

### P4 — Prune low-value tests
- **DELETE `solved-event.test.ts`** (whole file): it mocks the integration (calls `recordWin`+`addEntry` itself) rather than executing `+page.svelte`, so it does NOT guard the real wiring; every assertion is already covered by `stats.test.ts` + `leaderboard.test.ts` + `calcudoku/state.test.ts`. (ln-633 DELETE; ln-631 KEEP-noted one for persistence-key contract — resolved toward DELETE since the key format is implicitly exercised.)
- **Trim redundant E2E**: keep ≤1 of each `difficulty selector` / `size selector` / `timer ticks` smoke test (currently ×3 each = ~9 near-dups testing native `<select>`/`setInterval`, not app logic). ln-632.
- **Merge Rust duplicates**: calcudoku `test_validate_correct_after_json_roundtrip` into the all-sizes validate loop; bimaru/nonogram `*_correct` validate/check-errors twins → one each; empty-grid trio per command → one no-panic test. ln-633.
- **Fix vitest timing**: `calcudoku/state.test.ts` `tick()` uses a fixed 5ms sleep racing the `setTimeout(0)`+await validate chain → replace with `vi.waitFor(() => expect(state.isComplete).toBe(true))`. ln-635 (only place the CDP workaround is tested with a timing assumption, not a condition wait).

### P5 — Weak hint oracles (LOW)
`bimaru/hint.rs:test_hint_on_fresh_puzzle`, `bimaru/commands.rs:test_get_hint_returns_hint`, `nonogram|calcudoku commands test_hint_returns_something` assert `is_some()` only — assert the hinted `(r,c,value)` matches the solution (the nonogram/calcudoku *engine* hint tests already do this; the command wrappers drop it, so an index mis-map returns "something" and passes). ln-638.

## Deduplicated Findings Table

| # | Pri | Area | Finding | Sources | Action |
|---|-----|------|---------|---------|--------|
| 1 | HIGH | concurrency guards | requestCheck seq / requestHint in-flight+target / checkWin stale-game untested (all 3 games) | 634, 632 | Add vitest per guard |
| 2 | HIGH | gen oracle+flake+dup | per-size `is_some()` sweep: weak oracle + unseeded-RNG flake + redundant | 638, 635, 633 | Consolidate → parametrized + seeded + strong invariants |
| 3 | MED | E2E gaps | picture mode, loss-on-abandon, leaderboard ranking/display, play-again untested | 632 | Add mocks + journeys |
| 4 | MED | win-detection wiring | bimaru/nonogram filled-count win trigger has no vitest (only calcudoku) | 634 | Port state.test pattern |
| 5 | MED | redundant integration | `solved-event.test.ts` mocks the integration, guards nothing new | 633, 631 | DELETE file |
| 6 | LOW | E2E waste | selector/timer smoke ×3 each; `waitForTimeout(500)` sleeps | 632, 635 | Trim to 1; use auto-retry asserts |
| 7 | LOW | vitest timing | `calcudoku/state.test.ts` 5ms `tick()` sleep | 635 | `vi.waitFor(condition)` |
| 8 | LOW | hint oracle | command/bimaru hint tests assert `is_some()` not value | 638, 631 | Assert hinted value == solution |
| 9 | LOW | Rust dup | validate/check-errors `*_correct` twins, empty-grid trios, json-roundtrip double-loop | 633 | Merge |

## Clean Areas (no action)
- vitest stores: isolation correct (per-test ids + clear; no retry masking). ln-635.
- Rust solver tests: deterministic hand-built fixtures, 5s timeouts only loosen. ln-635.
- Rust command input-validation: empty/ragged/size-mismatch all covered with real oracles. ln-634.
- Stats/leaderboard logic: streak/best-time/write-queue/legacy-migration/rejected-write + sort/tie/cap/eviction — strong, non-redundant. ln-631, ln-633.
- No framework/stdlib/tautological tests anywhere. ln-631.

## Open Questions
- P2 requires a seeded-RNG test entry point in the generators; if undesired, the fallback is to keep one size per game with strong oracles and delete the rest (loses large-size coverage but removes flake). Decide before implementing.

## Cleanup Note
No temporary worker markdown reports were written (workers returned inline); nothing to remove. Sole durable report.
