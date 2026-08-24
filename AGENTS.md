# AGENTS.md — Operating rules for Clocky (`06-apps-clock/`)

Guidance for humans *and* AI coding agents working in this repo. This file yields to the
root [`~/dev/AGENTS.md`](https://github.com/Aldo-f/dev) rules on conflicts (one git root,
no hard-coded `/home/aldo`, pinned images, idempotency, safety-first).

## What this is

**Clocky** — a React 19 + TypeScript clock studio: 13 hand-built clocks (marble run,
binary matrix, rotating disc, nixie tubes, split-flap, game of life, …), an AI
customizer backed by a configurable multi-provider waterfall (Gemini, OpenAI-compatible
endpoints incl. Ollama/Groq), JWT-based auth with an admin dashboard (users, clocks,
AI providers, generation logs), a multi-clock dashboard with a timezone overlap matrix,
and a persistent community library. Served by Express; originally scaffolded in Google
AI Studio.

## Repo shape

```
server.ts                  ← Express bootstrap: routes, auth middleware, rate limits
server/
  authStore.ts             ← users (scrypt-hashed), JWT sign/verify; seeds admin on boot
  aiProviderStore.ts       ← AI providers + waterfall config (data/ai-config.json), logs (in-memory)
  aiWaterfallEngine.ts     ← provider/model execution, waterfall pipeline, local fallback
  communityStore.ts        ← shared clocks (data/community-clocks.json)
  clockValidation.ts       ← sanitize AI/community payloads against src/types contract
  fallbackGenerator.ts     ← deterministic Dutch keyword engine (no-network fallback)
  titleLocalization.ts     ← prod <title> ?lang= injection
index.html                 ← Vite entry
src/
  main.tsx / App.tsx       ← app shell; AuthProvider > LanguageProvider; /admin view
  context/AuthContext.tsx  ← JWT in localStorage `clocky_auth_jwt_token`, authFetch()
  components/
    clocks/                ← one file per clock (13), rendered by ClockRenderer.tsx
    DashboardView.tsx      ← multi-clock dashboard + TimezoneOverlapMatrix.tsx
    LibraryView.tsx        ← community gallery
    ClockCustomizerModal.tsx ← AI generation UI (calls /api/generate-clock)
    AdminDashboard.tsx     ← admin-only shell: tabs ai | clocks | users | logs
    admin/                 ← AIProviderSettings, ClockManagement, UserManagement, GenerationLogsView
    AuthModal.tsx          ← login/register modal
    FullscreenClockView.tsx / ParticleBackground.tsx / Language*.tsx
  data/presetClocks.ts     ← preset catalog — REQUIRED by App/Admin/tests; do not delete
  i18n/                    ← LanguageContext.tsx + translations.ts (+ derived types)
  types.ts                 ← shared client/server contract + ALLOWED_* option lists
  utils/                   ← audioSynth.ts, timeUtils.ts, urlRouter.ts, useZonedClock.ts,
                             fibonacciSolver.ts
test/                      ← vitest suites (unit tests for the pure/server logic)
data/                      ← gitignored runtime state (users.json, community-clocks.json,
                             ai-config.json); auto-created and reseeded if unreadable
.env.example, metadata.json (AI Studio manifest)
```

## Commands

```bash
npm install
npm run dev       # tsx server.ts → http://localhost:3000 (Express + Vite middleware)
npm run build     # vite build && esbuild server.ts --bundle → dist/server.cjs
npm start         # node dist/server.cjs
npm run lint      # tsc --noEmit            ← must pass before claiming done
npm test          # vitest run              ← must pass before claiming done
```

## Agent rules

1. **Verify against the real runtime.** `npm run lint` AND `npm test` must pass, and
   `npm run dev` must serve the app with real curl evidence before claiming done.
   No venv/path-only testing.
2. **Port discipline.** The server defaults to **port 3000** (`PORT` env overrides it).
   Check whether :3000 is free first (`ss -ltnp 'sport = :3000'`); if another service
   owns it, smoke-test on an override port instead of editing the default.
3. **Secrets stay out of git.** `.env` (gitignored) holds `GEMINI_API_KEY`,
   `JWT_SECRET` and any provider keys. Never commit keys; `.env.example` is the only
   tracked env file. Client credentials used by agent smoke tests live in `.env` too
   (`CLOCKY_USERNAME` / `CLOCKY_PASSWORD`) — read them from there, never hardcode.
4. **Runtime state lives in `data/`** (gitignored): `users.json`, 
   `community-clocks.json`, `ai-config.json`. Stores self-seed when missing/corrupt.
   Deleting `data/` resets users (incl. admin passwords) and community shares.
5. **Auth model.** Register/login issue an HS256 JWT (7-day expiry) verified via
   `Authorization: Bearer`. `requireAdmin` gates every `/api/admin/*` route — never
   weaken it or move checks client-side. On first boot a default admin
   `admin`/`admin123` is seeded: change/disable it before exposing the app publicly,
   and never ship new code that depends on that default.
6. **Adding a new clock:** create `src/components/clocks/<Name>Clock.tsx`, register it
   in the renderer/catalog (`src/data/presetClocks.ts`, `ClockRenderer.tsx`), give it a
   stable lowercase id — route matching (`urlRouter.ts`) resolves ids
   case-insensitively, also as `clock-<id>`.
7. **`src/data/presetClocks.ts` is load-bearing.** App.tsx, the admin ClockManagement
   view and `test/urlRouter.test.ts` import it; upstream once deleted it without a
   replacement and broke the build. If you remove/move it, migrate ALL importers in
   the same commit.
8. **i18n is mandatory for UI strings.** New user-facing strings go through
   `src/i18n/translations.ts` (via `LanguageContext`). The dictionary type is derived
   from the `nl` literal (`typeof nl`); adding a key only to `en/de/fr/es` fails the
   type check, and `test/i18nParity.test.ts` guards runtime parity.
9. **Server payloads are validated at the boundary.** Anything coming from the network
   into `clockStore`/responses goes through `sanitizeClockConfig` /
   `sanitizeCommunityClockInput`; enum option lists live in `src/types.ts`
   (`ALLOWED_*`) as the single source of truth for client and server.
10. **AI Studio heritage.** `metadata.json` and `.env.example` comments reference AI
    Studio injection (`GEMINI_API_KEY`, `APP_URL`); keep them working standalone too —
    dotenv loads `.env` locally.
11. **Vite HMR flag.** `DISABLE_HMR=true` disables HMR/file-watching (used by agents);
    don't remove that behavior from `vite.config.ts`.
12. **No nested git roots.** This directory is a submodule of `Aldo-f/dev`; commit here,
    push to `Aldo-f/clock`, then bump the pointer in `~/dev` if needed.

## Deployment notes (homelab)

Runs on the Raspberry Pi 5 homelab. If deployed behind Traefik, follow house rules:
pinned image tags, template under
`01-core-infra/templates/infra/<service>/` (never edit runtime dirs), route added to
Traefik config, then verify with the three-layer pattern (Python checks + Ansible asserts
+ compose structural validation) before done.

Before public exposure: set a strong `JWT_SECRET` in `.env` and disable or reseed the
default `admin`/`admin123` account (see rule 5).
