# Zzlepuh

Desktop puzzle game platform. Currently ships Bimaru (Battleship Solitaire).

Built with Tauri v2 + SvelteKit + Svelte 5 + Rust.

## Prerequisites

- Node.js 20+
- Rust (stable)
- Tauri v2 CLI: `cargo install tauri-cli`

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
npm run test:unit    # Rust tests (33 tests)
npm run test:e2e     # Playwright E2E (20 tests, auto-starts dev server)
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
| 6×6 | 1×3, 1×2, 2×1 | 7 |
| 8×8 | 1×4, 1×3, 2×2, 3×1 | 15 |
| 10×10 | 1×4, 2×3, 3×2, 4×1 | 20 |
| 12×12 | 1×5, 1×4, 2×3, 3×2, 4×1 | 25 |

## Project Structure

```
src/                    # SvelteKit frontend
  lib/games/bimaru/     # Bimaru components + state
  lib/services/         # Tauri invoke wrappers
  routes/               # Pages (/, /bimaru)
src-tauri/              # Rust backend
  src/games/bimaru/     # Generator, solver, hint engine
  src/commands/         # Tauri command handlers
e2e/                    # Playwright E2E tests
```
