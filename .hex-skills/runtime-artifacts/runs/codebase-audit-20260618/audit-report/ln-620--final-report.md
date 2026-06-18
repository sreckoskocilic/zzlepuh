# Codebase Audit — ln-620 Final Report

**Project:** Zzlepuh (Tauri v2 + SvelteKit + Svelte 5 desktop puzzle game)
**Run:** codebase-audit-20260618
**Scope:** ~4.7k Rust LOC, ~5.4k frontend LOC, 11 deps, 1 CI workflow
**Workers run:** ln-621 (security), ln-623 (duplication), ln-624 (hotspots), ln-626 (dead code), ln-628 (concurrency)
**Workers skipped (N/A):** ln-622 (single simple CI, gates exist), ln-625 (11 lean Tauri deps), ln-627 (no operators/telemetry — desktop game), ln-629 (trivial bootstrap, no config validation/shutdown surface)

## Executive Summary

Healthy, lean codebase. **No CRITICAL/HIGH security or correctness bugs.** Two real (LOW) async races from missing in-flight guards. Main payoff is maintainability: ~300 lines of byte-identical copy-paste across the 3 games (page wiring + undo/redo), and row/col mirror-duplication in all three Rust propagators. A few trivial cleanups (1 dead method, 1 ignored param, 4× duplicated `formatTime`).

**Verdict:** Ship-ready. No blocker. Address the two async guards opportunistically; schedule the duplication refactors before adding a 4th game.

## Prioritized Remediation Plan

1. **Quick wins (minutes):** delete dead `autoWaterDiagonalsNoTrack`; collapse 4× `formatTime` to one shared formatter / `timer.formatted`; decide on `_hintsUsed` (wire it or drop it).
2. **Real bugs (small):** add in-flight guard to `requestHint` + sequence token to `requestCheck` (stale-write races).
3. **Maintainability (medium, pre-4th-game):** extract `createGameSession` page helper + generic `UndoStack`.
4. **Engine refactor (medium, optional):** axis-abstraction helper to kill row/col mirror-duplication in the three `propagate` fns; split the 80-line nonogram `generate_placements_rec`.

## Confirmed Issues

| # | Sev | Location(s) | Problem | Source | Fix | Acceptance |
|---|-----|-------------|---------|--------|-----|-----------|
| 1 | LOW | bimaru/state.svelte.ts:108-138; nonogram:144-169; calcudoku:188-220 | `requestHint` captures only gameId, awaits, writes hint cell blindly. User edits/Undo while in flight → hint overwrites just-placed cell; undo `prev` read at resolve-time mismatches. Buttons not disabled during flight. | ln-628 | Add `isHinting` flag (disable Hint while pending) OR re-read target cell on resolve and skip if no longer empty, mirroring `checkWin` gridUnchanged guard. | Rapid edit-during-hint cannot overwrite a user cell; undo entry consistent. |
| 2 | LOW | bimaru:192-212; nonogram:171-191; calcudoku:222-237 | `requestCheck` re-entrancy: out-of-order resolution of two in-flight checks lets a slow stale result overwrite newer `errorCells`. gameId guard doesn't catch (same game). | ln-628 | Monotonic sequence token per request; on resolve bail if a newer check started. Or disable Check while pending. | Double-click Check never shows stale errors. |
| 3 | HIGH (maint) | routes/{bimaru,nonogram,calcudoku}/+page.svelte (~135-line `<script>` each, ~95% identical) | Timer lifecycle, win-record `$effect`, undo-resume `$effect` (byte-identical incl. comment), handlers, win bookkeeping, keydown undo/redo all copy-pasted ×3. Timing-sensitive (CDP `setTimeout(0)`) logic edited in triplicate. | ln-623 | `createGameSession(gameId, state, {getSize, getDifficulty, isTrackable})` in src/lib/stores/game-session.svelte.ts. Parameterize Nonogram's `isPicture` stats-exclusion. | One copy of timer/win/undo wiring; 3 pages keep only game-specific markup. |
| 4 | HIGH (maint) | bimaru/state.svelte.ts:172-190; nonogram:197-215; calcudoku:243-263 | `undo()`/`redo()` structurally identical stack machines; Bimaru/Nonogram share exact `CellChange` shape; Calcudoku differs only in Change fields. | ln-623 | Generic `UndoStack<Change>` (push/undo/redo/canUndo/clear) with applier callbacks, src/lib/stores/undo-stack.svelte.ts. Keep `$state` arrays inside helper. | All 3 games reuse one stack; E2E undo/redo green. |
| 5 | HIGH | nonogram/solver.rs:266-345 `generate_placements_rec` | 80-line recursive fn, nesting 5, ~12 branches; opaque invariant at :299, no comment. | ln-624 | Extract `can_place_block` + `is_gap_clear` helpers; name the remaining-clues min-width arithmetic. | Fn < ~40 lines; helpers unit-tested. |
| 6 | HIGH | bimaru/solver.rs:152-259 `propagate` | 107-line fn; row & col scan blocks duplicated per rule (axis-swapped). Rule change = edit 2 mirror blocks. | ln-624 | Split into `apply_zero_clues`/`apply_satisfied`/`apply_forced_fill`/`apply_diagonal_water`; or axis-abstraction `for_each_line`. Hoist `const DIAGONALS` (also at solver.rs:461, generator.rs). | One copy per rule; diagonal offsets defined once. |
| 7 | MED | calcudoku/solver.rs:119-200 `propagate` | 81-line fn, 4 duplicated row/col scan blocks (naked/hidden singles ×2). Same mirror-dup as #6. | ln-624 | `eliminate_singles` + `assign_hidden_singles` helpers; abstract row/col via index-mapping/transpose. | Single implementation per rule. |
| 8 | MED | bimaru/generator.rs:278-346 `select_hints` | 68-line two-pass fn; unreadable water-quota guard at :317; unused `_difficulty` param. | ln-624 | Split `place_balanced_hints` + `top_up_hints`; `let water_target = hint_count - target_ship`; drop `_difficulty`. | Two named passes; no dead param. |
| 9 | MED | bimaru/solver.rs:328-369 `find_best_unknown` | MRV `constraint_score` collapses to 0 for satisfied lines → ranks full-line cells as *most* preferred; no comment, latent trap. | ln-624 | Document scoring contract (lower=first, 0=forced) or rename `branch_priority`. | Intent documented; behavior unchanged or corrected. |
| 10 | MED | calcudoku/generator.rs:80-161 `generate_cages` | 81-line fn, nesting 4; single-cell branch (:111-120) duplicates push tail (:151-158). | ln-624 | Extract `grow_cage` + `finalize_cage`. | No duplicated push; growth isolated. |
| 11 | MED (maint) | state.svelte.ts `requestCheck`/`checkWin`/`requestHint` skeletons ×3 | Same captured-gameId→invoke→stale-guard→timeout pattern; only predicate/args differ. | ln-623 | `GameStateBase`/composables (`runCheck`, `runValidation`). **Defer to 4th game** — preserve `setTimeout(0)` + grid-snapshot verbatim. | N/A until 4th game. |
| 12 | LOW | bimaru/generator.rs:9-64 + solver.rs:25 | `strip_hints` 9 positional args; `count_solutions_timed` 8 positional incl. bare `2` (uniqueness limit). Transposition risk. | ln-624 | `GridDims{rows,cols}` struct; `const UNIQUENESS_LIMIT = 2` (recurs nonogram:122, calcudoku:77). | Named params/consts. |
| 13 | LOW | nonogram/generator.rs:61-133 `generate_large` | Manual 3-field flip/undo restore; col-clue recompute duplicated (:98-102, :109-112). | ln-624 | `recompute_clues_for(...)` + `flip_cell` returning undo token. | Single recompute path. |
| 14 | LOW | bimaru/state.svelte.ts:240 `autoWaterDiagonalsNoTrack` | **Dead method** — only definition, zero call sites (verified via repo grep). YAGNI leftover. | ln-623 (ln-626 missed; conflict resolved → confirmed dead) | Delete. | Build/E2E green after removal. |
| 15 | LOW | stats.svelte.ts:30 `recordWin(_hintsUsed)` | Param accepted and ignored; callers pass real hint counts that vanish. | ln-623 | Wire into stats or drop from signature. | Hints tracked or param gone. |
| 16 | LOW | Leaderboard.svelte:12; routes/{bimaru:234,nonogram:275,calcudoku:319}/+page.svelte | `formatTime` defined **4×** identically; duplicates `timer.formatted` (timer.svelte.ts:40). | ln-623 | Delete all 4; expose one shared formatter / reuse `timer.formatted`. | Single formatter. |
| 17 | LOW | src-tauri/tauri.conf.json (`style-src 'unsafe-inline'`) | Inline-style injection vector (scripts already blocked, so not script-XSS). Cosmetic for a local-data app. | ln-621 | Optional: drop `'unsafe-inline'` from `style-src`, use hashed/nonce styles. | CSP tightened if pursued. |

## Deduplication Notes

- **#3/#4/#11** (ln-623) and **#6/#7** (ln-624) share a theme — repeated structure — but are kept separate per boundary rules: ln-623 owns cross-game FE duplication (page wiring, undo stack); ln-624 owns within-module Rust readability (mirror row/col blocks). No double-count.
- **#14** flagged by ln-623; ln-626 (dead-code owner) reported "no dead code" — conflict resolved by direct grep: only the definition exists, zero call sites → confirmed dead, ln-623 correct.
- `const DIAGONALS` hoist (#6) and `UNIQUENESS_LIMIT` (#12) are magic-literal consolidations spanning multiple files; counted once each at the primary site.

## Clean Areas (no findings)

- **Security (ln-621):** IPC input fully validated (rows==0, ragged, clue-length, size clamps); no panic reachable from IPC args; solution never crosses IPC (`validate_*`→bool, `check_*_errors`→coords, `get_*_hint`→one cell); no integer overflow (calcudoku Multiply 9^9 < u32::MAX); solver DoS capped by 5s `solve_timed`; updater endpoint pinned + minisign pubkey present + NSIS-only; CSP tight (`default-src 'self'`, no `unsafe-eval`); capabilities minimal (store/updater/process/log only); no secrets committed.
- **Dead code (ln-626):** none beyond #14; all 14 commands map 1:1 to `invoke()`; all components/exports referenced; no commented-out code; 5 `#[allow(dead_code)]` sites are test-reachable (keep attributes).
- **Concurrency (ln-628):** `spawn_blocking` closures own their data (no shared mutable state, panics surface as Err not hang); all 3 generators hard-bounded (no infinite loop); `startNewGame` guarded by `isGenerating`; `checkWin` gridUnchanged+gameId+isValidating triple-guard prevents stale/double win; updater no-op outside Tauri, store load() promise cached.

## Open Questions / Warnings

- None blocking. The engine refactors (#5–#10) are quality-of-life; the suite has 108 Rust tests so regressions surface fast, but verify coverage of the extracted helpers.

## Cleanup Note

No temporary worker markdown reports were written to disk (workers returned findings inline); nothing to remove. This is the sole durable report.
