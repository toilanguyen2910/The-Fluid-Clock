# AGENTS.md

## What this repository is today
- This is now a Vite + React + TypeScript web app for `The Fluid Clock`.
- Core app code lives in `src/`; static entry is `index.html`; dependencies and scripts are in `package.json`.
- IntelliJ metadata (`Du An test.iml`, `.idea/*`) still exists and points compiler output to `out/`, but runtime build output is `dist/`.

## How to approach changes
- Treat `package.json` scripts as the source of truth for local workflows.
- Keep feature logic in `src/lib/*`, content pools in `src/content/*`, and UI composition in `src/App.tsx`.
- Keep `.idea` changes minimal; only touch module/project settings when project layout changes.

## Current structure cues
- `src/lib/sunPhase.ts` contains phase calculation, geolocation fallback, and poem selection helpers.
- `src/content/poems.vi.ts` stores Vietnamese lines grouped by sky phase.
- `src/styles.css` drives gradients/cloud animation and `prefers-reduced-motion` behavior.
- `src/lib/sunPhase.test.ts` contains fast logic tests run by Vitest.

## Workflow expectations for future code
- Install deps: `npm install`
- Local dev server: `npm run dev`
- Tests: `npm run test`
- Production build: `npm run build`
- Local preview of built app: `npm run preview`

## Agent checklist
- Preserve the no-numeric-time UX concept: no digital clock values in the main UI.
- Prefer adding behavior via pure functions in `src/lib` and cover them with Vitest tests.
- Keep fallback behavior graceful when geolocation is denied or unavailable.
- Update this file when architecture, scripts, or deployment flow changes.
