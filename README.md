# Zzlepuh

Puzzle games for desktop. Bimaru (battleship solitaire), Nonogram (paint by numbers), Calcudoku (KenKen).

Tauri v2, SvelteKit, Svelte 5, Rust.

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