# Clocky

Interactive collection of unique clocks: kinetic marble run, binary matrix, rotating
disc, chromatic palette, nixie tubes, split-flap, game of life, word clock and more —
plus an AI customizer (Google Gemini) that generates brand-new clock styles, and a
community library for sharing creations.

Originally scaffolded in Google AI Studio; now a standalone React app served by Express.

- **Repo:** [Aldo-f/clock](https://github.com/Aldo-f/clock)
- **Stack:** React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Express · @google/genai · motion · lucide-react

## Highlights

- **13 hand-built clocks** — see [Features](features.md)
- **AI customizer** — describe a clock, Gemini generates a full style config (`POST /api/generate-clock`)
- **Multi-clock dashboard** — several clocks + timezone overlap matrix on one screen
- **Community library** — share & like clock configs (in-memory store, resets on restart)
- **i18n** — language selector + auto-detect banner
- **Deep linking** — `/clock/:id`, `?embed=true` for embedding, `?lang=`, `?tz=`

## Quickstart

```bash
npm install
cp .env.example .env          # fill in GEMINI_API_KEY (required only for AI features)
npm run dev                   # http://localhost:3000 (Express + Vite middleware)
```

Production:

```bash
npm run build                 # vite build + esbuild server → dist/
npm start                     # node dist/server.cjs (serves dist/ on :3000)
```

See [Development](development.md) for environment variables, scripts and conventions.
