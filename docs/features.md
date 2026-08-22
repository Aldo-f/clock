# Features

## The 13 clocks

| Clock | Route id | Description |
|-------|----------|-------------|
| Rotating Disc | `clock-rotating-disc` | Classic rotating disc face |
| Binary Matrix | `clock-binary` | Time rendered as binary columns |
| Marble Run | `clock-marble-run` | Kinetic marbles count the seconds |
| Color Palette | `clock-color-palette` | Chromatic palette time display |
| Word Clock (Dutch) | `clock-word-dutch` | Dutch word-clock ("tien over tien") |
| Nixie Tubes | `clock-nixie` | Glowing vintage nixie tube digits |
| Fibonacci | `clock-fibonacci` | Fibonacci-sequence clock face |
| Solar Orbit | `clock-solar-orbit` | Planetary orbit timekeeping |
| Split-Flap | `clock-split-flap` | Airport-style split-flap digits |
| Liquid Ferrofluid | `clock-liquid-ferrofluid` | Ferrofluid blob animation |
| Oscilloscope | `clock-oscilloscope` | Soundwave oscilloscope trace |
| Game of Life | `clock-game-of-life` | Conway's game ticks away the time |

Each clock lives in `src/components/clocks/` and is registered in
`src/data/presetClocks.ts` + `src/components/clocks/ClockRenderer.tsx`.

## AI customizer

Describe a clock in natural language; Google Gemini generates a complete style config.
Powered by `POST /api/generate-clock` (requires `GEMINI_API_KEY` in `.env`).

## Multi-clock dashboard

Run several clocks side by side with a timezone overlap matrix — `/dashboard` or `/multi`.

## Community library

Share and like clock configurations at `/library`. Data is stored **in memory** on the
server and resets on restart.

## Internationalization

Language selector with auto-detect banner. New user-facing strings must go through
`src/i18n/translations.ts` (via `LanguageContext`) — no hard-coded copy.

## Deep linking & embedding

| Path / param | Meaning |
|--------------|---------|
| `/` | Gallery (default view) |
| `/clock/:id` or `?c=` | Fullscreen single clock |
| `/dashboard` or `/multi` | Multi-clock dashboard |
| `/library` or `/community` | Community library |
| `?lang=` / `?l=` | Force UI language |
| `?tz=` | Timezone override |
| `?embed=true` | Embed mode (chrome hidden) |
