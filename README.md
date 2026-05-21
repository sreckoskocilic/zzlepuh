# Zzlepuh

Desktop puzzle game platform. Ships Bimaru (Battleship Solitaire) and Nonogram (Paint by Numbers).

Built with Tauri v2 + SvelteKit + Svelte 5 + Rust.

## Prerequisites

- Node.js 20+
- Rust (stable)

## Setup

```bash
npm install
npx playwright install --with-deps   # only needed for E2E tests
```

## Development

```bash
npm run dev          # Vite dev server (localhost:5173)
npm run tauri dev    # Full desktop app with hot reload
```

## Build

```bash
npm run build        # Frontend only
npm run tauri build  # Full desktop app (.dmg / .app)
```

## Tests

```bash
npm run test:unit    # Rust tests (68 tests)
npm run test:e2e     # Playwright E2E (39 tests, auto-starts dev server)
npm run test:e2e:ui  # Playwright interactive UI mode
```

## Checks

```bash
npm run check        # TypeScript / Svelte type checking
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
```

## Grid Sizes & Fleets

| Size | Fleet | Ship cells |
|------|-------|------------|
| 6×6 | 1×3, 2×2, 3×1 | 10 |
| 8×8 | 1×4, 1×3, 2×2, 3×1 | 14 |
| 10×10 | 1×4, 2×3, 3×2, 4×1 | 20 |
| 12×12 | 1×5, 1×4, 2×3, 3×2, 4×1 | 25 |

## Project Structure

```
src/                    # SvelteKit frontend
  lib/games/bimaru/     # Bimaru components + state
  lib/games/nonogram/   # Nonogram components + state
  lib/services/         # Tauri invoke wrappers
  routes/               # Pages (/, /bimaru, /nonogram)
src-tauri/              # Rust backend
  src/games/bimaru/     # Bimaru generator, solver, hint engine
  src/games/nonogram/   # Nonogram generator, solver, hint engine
  src/commands/         # Tauri command handlers
e2e/                    # Playwright E2E tests
```
