# AGENTS.md — Operating rules for Clocky (`06-apps-clock/`)

Guidance for humans *and* AI coding agents working in this repo. This file yields to the
root [`~/dev/AGENTS.md`](https://github.com/Aldo-f/dev) rules on conflicts (one git root,
no hard-coded `/home/aldo`, pinned images, idempotency, safety-first).

## What this is

**Clocky** — a React 19 + TypeScript clock studio: 13 hand-built clocks (marble run,
binary matrix, rotating disc, nixie tubes, split-flap, game of life, …), an AI
customizer powered by Google Gemini, a multi-clock dashboard with a timezone overlap
matrix, and an in-memory community library. Served by Express; originally scaffolded in
Google AI Studio.

## Repo shape

```
server.ts                  ← Express API + static/vite serving (port 3000)
index.html                 ← Vite entry
src/
  main.tsx / App.tsx       ← app shell, view switching via src/utils/urlRouter.ts
  components/
    clocks/                ← one file per clock (13), rendered by ClockRenderer.tsx
    DashboardView.tsx      ← multi-clock dashboard + TimezoneOverlapMatrix.tsx
    LibraryView.tsx        ← community gallery
    ClockCustomizerModal.tsx ← AI generation UI (calls /api/generate-clock)
    FullscreenClockView.tsx / ParticleBackground.tsx / Language*.tsx
  data/presetClocks.ts     ← preset catalog (ids referenced by routes & tests)
  i18n/                    ← LanguageContext.tsx + translations.ts
  utils/                   ← audioSynth.ts, timeUtils.ts, urlRouter.ts
assets/, .env.example, metadata.json (AI Studio manifest)
```

## Commands

```bash
npm install
npm run dev       # tsx server.ts → http://localhost:3000 (Express + Vite middleware)
npm run build     # vite build && esbuild server.ts --bundle → dist/server.cjs
npm start         # node dist/server.cjs
npm run lint      # tsc --noEmit  ← run before claiming done
```

## Agent rules

1. **Verify against the real runtime.** `npm run lint` must pass and `npm run dev` must
   serve `http://localhost:3000` with real curl evidence before claiming done. No venv/
   path-only testing.
2. **Port discipline.** The server hard-codes **port 3000** (`server.ts`, `const PORT =
   3000`). Check `lsof -i :3000` first. Do not renumber casually — other tooling may
   assume it.
3. **Secrets stay out of git.** `GEMINI_API_KEY` lives in `.env` (gitignored). Never
   commit keys; `.env.example` is the only tracked env file.
4. **Community store is in-memory.** `/api/community-clocks` data resets on restart.
   Don't add features that assume persistence without adding real storage.
5. **Adding a new clock:** create `src/components/clocks/<Name>Clock.tsx`, register it in
   the renderer/catalog (`src/data/presetClocks.ts`, `ClockRenderer.tsx`), give it a
   stable lowercase id — route matching (`urlRouter.ts`) resolves ids case-insensitively,
   also as `clock-<id>`.
6. **i18n is mandatory for UI strings.** New user-facing strings go through
   `src/i18n/translations.ts` (via `LanguageContext`) — no hard-coded copy.
7. **AI Studio heritage.** `metadata.json` and `.env.example` comments reference AI
   Studio injection (`GEMINI_API_KEY`, `APP_URL`); keep them working standalone too —
   dotenv loads `.env` locally.
8. **Vite HMR flag.** `DISABLE_HMR=true` disables HMR/file-watching (used by agents);
   don't remove that behavior from `vite.config.ts`.
9. **No nested git roots.** This directory is a submodule of `Aldo-f/dev`; commit here,
   push to `Aldo-f/clock`, then bump the pointer in `~/dev` if needed.

## Deployment notes (homelab)

Runs on the Raspberry Pi 5 homelab. If deployed behind Traefik, follow house rules:
pinned image tags, template under
`01-core-infra/templates/infra/<service>/` (never edit runtime dirs), route added to
Traefik config, then verify with the three-layer pattern (Python checks + Ansible asserts
+ compose structural validation) before done.
