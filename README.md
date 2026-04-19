# The Fluid Clock

A poetic web clock that does not show numeric time. The interface changes with the sky color at your location and displays a random Vietnamese poetic line.

## Features

- Timezone-first sky mood (no location required by default)
- Optional precise location mode using `SunCalc` (sun position + sunrise/sunset windows)
- No numeric hours/minutes on screen
- Dynamic CSS gradients and cloud motion by sky phase
- Sun/moon/star visual layers that shift by sky phase
- Rich Vietnamese lines per phase, rotated with early-repeat avoidance
- Mobile-first typography and glass panel tuning for a softer reading vibe
- Graceful fallback when location is denied or slow
- Reduced-motion support via `prefers-reduced-motion`

## Tech

- React + TypeScript + Vite
- `suncalc` for sun phase calculations
- Vitest for minimal logic tests

## Quick start

```powershell
npm install
npm run dev
```

Open the local URL shown by Vite and allow location access for accurate sky state.

## Test and build

```powershell
npm run test
npm run build
npm run preview
```

## Deploy (Vercel)

1. Push this repository to GitHub.
2. Import project on Vercel.
3. Build command: `npm run build`
4. Output directory: `dist`

No environment variables are required for the MVP.

## Project structure

- `src/App.tsx`: app orchestration (geolocation, ticking, poem rotation)
- `src/lib/sunPhase.ts`: sun-phase engine and fallback logic
- `src/content/poems.vi.ts`: Vietnamese poetic lines by phase
- `src/styles.css`: animated sky scene styles

