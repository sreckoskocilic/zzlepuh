# Pattern / Architecture Audit — ln-640 Final Report

**Project:** Zzlepuh (Tauri v2 + SvelteKit + Svelte 5 desktop puzzle game)
**Run:** pattern-audit-20260618
**Workers run:** ln-641 (pattern-fitness), ln-642 (layer-ownership), ln-643 (api-contract), ln-644 (dependency-topology), ln-646 (project-structure)
**Skipped:** ln-645 (modernization — tiny app, overlaps 641), ln-647 (config-boundary — no config/env layer beyond tauri.conf.json)

## Executive Summary

Architecture is **disciplined and well-fitted**. Module-singleton state is idiomatic for a single-window `ssr=false` Svelte 5 app; the frontend↔backend split is sound and the "solution never leaves Rust" invariant holds at the contract level (commands return only `bool` / coords / single hint; `*Solution` structs aren't even `Serialize`). IPC type parity is faithful and tested. Backend dependency topology is a clean layered DAG with zero cycles.

Three genuinely actionable items, all low-to-medium risk:
1. **Two generic components (`WinOverlay`, `Leaderboard`) live inside `games/bimaru/`** and are imported by the other two games — the only cross-game coupling in the codebase. Mechanical move fixes it.
2. **Validation engine logic is inlined in the command handlers** instead of delegated to `games/<g>/` — a backend layer leak (worst in bimaru).
3. **Page-level win/timer/stat orchestration is triplicated** across the 3 `+page.svelte` — the known duplication (createGameSession), real but timing-sensitive.

Everything else is cosmetic (service-file naming) or low-severity (error-contract lossiness, picture-title at IPC start).

**Verdict:** No structural rot. Item 1 (+ the service rename) is the clean, high-value, low-risk fix. Item 2 is a worthwhile backend layer cleanup. Item 3 stays deferred (timing risk > maintainability gain) unless a 4th game lands.

## Prioritized Remediation Plan

### P1 — Move shared components to a neutral home (HIGH topology+structure, LOW risk)
`src/lib/games/bimaru/WinOverlay.svelte` and `src/lib/games/bimaru/Leaderboard.svelte` are game-agnostic (they import only `types/game` + `utils/format`) yet sit in a peer game's folder; `nonogram/+page.svelte` and `calcudoku/+page.svelte` reach into `bimaru/` for them. Move both → `src/lib/components/` (currently holds only `Sidebar.svelte` — an under-used neutral home), update the 3 importers each. Removes nonogram's and calcudoku's only dependency on `bimaru/`. Mechanical, no logic untangling.
- Source: ln-644 (HIGH ×2), ln-646 (HIGH ×2). Acceptance: no `routes/*` imports across game folders; build + E2E green.
- **Bundle the cosmetic rename** `src/lib/services/tauri.ts` → `bimaru-tauri.ts` (peers are `<game>-tauri.ts`; bimaru is special-cased) while touching imports. ln-646 (MED), ln-641 (LOW).

### P2 — Delegate validation logic from command handlers to the engine (HIGH/MED layer leak)
Command handlers hand-roll domain rules that belong in `games/<g>/`:
- `commands/bimaru.rs:45-91,188-220` — `validate_bimaru_solution` inlines clue counting, diagonal-adjacency, and a private `extract_ship_lengths()` ship-segmentation routine. **HIGH** — solver/types logic in the IPC layer.
- `commands/calcudoku.rs:46-73` — `validate_calcudoku_solution` hand-rolls row/col Latin uniqueness in the handler while delegating only the cage check. Inconsistent (half engine-owned, half handler-owned). **MED**
- `commands/nonogram.rs:71-86,132-144` — `validate_nonogram_solution` / `check_nonogram_errors` orchestrate clue-matching/diff in the handler. **MED**
- Fix: add `is_valid_solution()` / `diff_against_solution()` to each game's `solver.rs`/`types.rs`; commands keep only shape/bounds guards then delegate. Acceptance: command tests stay green; handlers reduce to guard + delegate.
- Source: ln-642.

### P3 — createGameSession (page orchestration triplication) — DEFER
Win-recording `$effect` + `winTimeout`/`winRecordedForGameId` guard + timer-resume-on-undo `$effect` + recordLoss-on-new-game are copy-pasted across all 3 pages (bimaru/+page.svelte:96-126, nonogram:125-158, calcudoku:114-150). Business orchestration in the view layer.
- ln-642 rated HIGH (layer leak), ln-641 rated MED (under-abstraction). **Conflict resolved toward DEFER**: the shared logic carries the timing-sensitive `setTimeout(0)` CDP workaround + leaderboard ranking; extraction is pure maintainability (no behavior change) on the most delicate, user-visible flow. Risk-adjusted value is negative until a 4th game justifies it. Re-evaluate then.

### P4 — Low-severity polish (optional)
- **Error contract** split 3 ways (`Result<_,String>` / bare `bool` / `Option`/`Vec`): `None`/empty-Vec conflates "invalid input" vs "no result" vs "solver timeout" on hint/error commands. Read-only → UX lossiness, not corruption. Upgrade to `Result<Option<T>, String>` only if the UI needs to branch on error kind. ln-643 (LOW).
- **`listNonogramPictures()` called from the page** (nonogram/+page.svelte:9,27) bypasses the state singleton (every other Tauri call routes through state). Add `nonogramState.loadPictures()`. ln-642 (LOW).
- **Picture title crosses IPC at game start** (`to_puzzle()` ships `title: Some(...)`); spoiler-hiding relies on frontend discipline. Image isn't spoiled (only clues sent), title is. Acceptable; if strict, omit title on generate + add `reveal_nonogram_title(id)` on win. ln-642 (LOW).
- **Singleton testability**: `solved-event.test.ts` casts `as unknown` to clear `leaderboardStore.boards` (no `reset()`). Add `__resetForTest()` only if stores get more unit tests. ln-641 (LOW).

## Deduplicated Findings Table

| # | Pri | Finding | Sources | Action |
|---|-----|---------|---------|--------|
| 1 | HIGH | `WinOverlay`/`Leaderboard` generic but in `games/bimaru/`; peers reach in | 644, 646 | Move → `components/`; update 3 importers |
| 2 | HIGH/MED | Validation domain logic inlined in command handlers (bimaru worst) | 642 | Delegate to `games/<g>/` engine |
| 3 | HIGH/MED | Page win/timer/stat orchestration triplicated | 642, 641 | DEFER (createGameSession; timing risk) |
| 4 | MED | `services/tauri.ts` unprefixed vs `<game>-tauri.ts` | 646, 641 | Rename `bimaru-tauri.ts` (bundle w/ #1) |
| 5 | LOW | Error contract split 3 ways; Option/empty conflates 3 meanings | 643 | Optional `Result<Option<T>,String>` |
| 6 | LOW | `listNonogramPictures` called from page, bypasses state | 642 | `nonogramState.loadPictures()` |
| 7 | LOW | Picture title crosses IPC at start | 642 | Acceptable; reveal-on-win command if strict |
| 8 | LOW | Singleton test reset via `as unknown` cast | 641 | `__resetForTest()` if needed |

## Clean Areas (no action)
- **Backend topology**: strict layered DAG `lib.rs → commands/<g> → games/<g>/{generator,hint,solver,pictures} → types`; all intra-game `use super::*`; no game imports another game; commands the sole caller of games. Zero cycles. ln-644.
- **Frontend layering**: services are pure invoke wrappers (no logic/state); state singletons never bypass services; components never reach past state; stores never import up into games. ln-642.
- **"Solution never leaves Rust"**: verified at contract level — no command returns a `solution`; `*Solution` structs not `Serialize`. ln-642, ln-643.
- **IPC type parity**: enum cases (snake_case serde ↔ TS literal unions), optional fields, numeric widths all aligned; JSON round-trip tested. No internal/engine leakage. ln-643.
- **Pattern fitness**: module-singleton state idiomatic for `ssr=false` single-window app (context API would be premature); `UndoStack<M>` correctly scoped (3 real consumers, opaque moves); no god-objects, no speculative extension points. ln-641.

## Open Questions
- P2 requires deciding where each validation fn lives (`solver.rs` vs `types.rs`); pick per game by where the existing related logic sits.

## Cleanup Note
No temporary worker markdown reports written (workers returned inline); nothing to remove. Sole durable report.
