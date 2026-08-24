# Clocky — README

Interactive collection of unique clocks: kinetic marble run, binary matrix, rotating
disc, chromatic palette, nixie tubes, split-flap, game of life, word clock and more —
plus an AI customizer backed by a configurable multi-provider waterfall, JWT auth with
an admin dashboard, and a persistent community library.

Originally scaffolded in Google AI Studio; now a standalone React app served by Express.

## Features

- **13 hand-built clocks** — see `src/components/clocks/`
- **AI customizer with provider waterfall** — describe a clock; the request walks a
  configurable chain of models (Gemini, OpenAI-compatible endpoints incl. Ollama/Groq)
  and falls back to a deterministic local design engine
  (`POST /api/generate-clock`)
- **Accounts & admin dashboard** — register/login (JWT), admin-only `/admin` view for
  users, clocks, AI providers/waterfall and generation logs
- **Multi-clock dashboard** — several clocks + timezone overlap matrix on one screen
- **Community library** — share & like clock configs (persisted to `data/community-clocks.json`)
- **i18n** — language selector + auto-detect banner (`src/i18n/`)
- **Deep linking** — `/clock/:id`, `/dashboard`, `/library`, `/admin`, `?embed=true`,
  `?lang=`, `?tz=`

## Quickstart

```bash
npm install
cp .env.example .env          # fill in GEMINI_API_KEY (optional; local fallback works without)
npm run dev                   # http://localhost:3000 (Express + Vite middleware)
```

Production:

```bash
npm run build                 # vite build + esbuild server → dist/
npm start                     # node dist/server.cjs (serves dist/ on :3000)
```

First boot seeds a default admin **`admin` / `admin123`** in `data/users.json` — change or
disable it before exposing the app. Set `JWT_SECRET` in `.env` for production (otherwise a
hardcoded dev fallback is used).

## Environment variables

| Variable               | Required | Purpose                                                     |
|------------------------|----------|-------------------------------------------------------------|
| `GEMINI_API_KEY`       | for AI   | Google Gemini key used by the built-in Gemini provider      |
| `JWT_SECRET`           | prod     | HS256 signing secret for auth tokens (7-day expiry); **required in production** |
| `ADMIN_USERNAME`       | no       | Username for the seeded first-boot admin (default `admin`)  |
| `ADMIN_PASSWORD`       | no       | Password for the seeded admin (default `admin123` — override!) |
| `PORT`                 | no       | Override listen port (default `3000`)                       |
| `AUTH_STORE_PATH`      | no       | Custom path for `users.json`                                |
| `COMMUNITY_STORE_PATH` | no       | Custom path for `community-clocks.json`                     |
| `AI_CONFIG_PATH`       | no       | Custom path for `ai-config.json`                            |
| `GENERATION_LOGS_PATH` | no       | Custom path for `generation-logs.json`                      |
| `APP_URL`              | no       | Public base URL, used for self-referential links            |

`.env*` is gitignored; only `.env.example` is tracked.

## API

Auth: send `Authorization: Bearer <token>` from `/api/auth/login|register`.
Rate limits: ~600 req/15 min per IP on `/api/*`; 30 req/5 min on generation.

| Method | Path                                        | Auth   | Description                                    |
|--------|---------------------------------------------|--------|------------------------------------------------|
| POST   | `/api/auth/register`                        | –      | Create account, returns JWT                    |
| POST   | `/api/auth/login`                           | –      | Login, returns JWT                             |
| GET    | `/api/auth/me`                              | user   | Current user from token                        |
| POST   | `/api/generate-clock`                       | –      | Run the AI waterfall for a clock config        |
| GET    | `/api/community-clocks`                     | –      | List shared community clocks                   |
| POST   | `/api/community-clocks`                     | opt.   | Share a clock (author = username if logged in) |
| POST   | `/api/community-clocks/:id/like`            | –      | Like a community clock                         |
| GET    | `/api/admin/users`                          | admin  | List users                                     |
| POST   | `/api/admin/users`                          | admin  | Create user (role selectable)                  |
| PATCH  | `/api/admin/users/:id`                      | admin  | Update role/active/email/password              |
| DELETE | `/api/admin/users/:id`                      | admin  | Delete user (last-admin protected)             |
| GET    | `/api/admin/ai-config`                      | admin  | Providers + waterfall (API keys masked)        |
| POST/PUT/DELETE | `/api/admin/ai-providers[...]`     | admin  | Manage providers                               |
| POST   | `/api/admin/ai-providers/:id/fetch-models`  | admin  | Pull model list from a provider endpoint       |
| POST   | `/api/admin/ai-providers/test`              | admin  | Test one provider/model pair                   |
| PUT    | `/api/admin/ai-waterfall`                   | admin  | Replace waterfall steps + fallback toggle      |
| POST   | `/api/admin/ai-waterfall/simulate`          | admin  | Dry-run waterfall with step trace              |
| GET    | `/api/admin/generation-logs`                | admin  | Last 200 generation attempts (in-memory)       |
| GET/POST/PUT/DELETE | `/api/admin/clocks[...]`       | admin  | Manage stored community/preset-override clocks |

Runtime state lives in gitignored `data/`: `users.json`, `community-clocks.json`,
`ai-config.json`, `generation-logs.json`. Stores self-seed when missing or corrupt;
deleting `data/` resets accounts (incl. the seeded admin), shares and AI provider
config. Generation logs keep the last 200 attempts and survive restarts.

## URL routing

| Path / param              | Meaning                          |
|---------------------------|----------------------------------|
| `/`                       | Gallery (default view)           |
| `/clock/:id` or `?c=`     | Fullscreen single clock          |
| `/dashboard` or `/multi`  | Multi-clock dashboard            |
| `/library` or `/community`| Community library                |
| `/admin`                  | Admin dashboard (admins only)    |
| `?lang=` / `?l=`          | Force UI language                |
| `?tz=`                    | Timezone override                |
| `?embed=true`             | Embed mode (chrome hidden)       |

## Scripts

| Script          | What it does                                        |
|-----------------|-----------------------------------------------------|
| `npm run dev`   | `tsx server.ts` — Express + Vite dev server (:3000) |
| `npm run build` | Client bundle + bundled server (`dist/server.cjs`)  |
| `npm start`     | Run the production server                           |
| `npm run lint`  | `tsc --noEmit` type check                           |
| `npm test`      | `vitest run` unit tests                             |
| `npm run clean` | Remove `dist/`                                      |

CI runs lint + tests + build on every push/PR (`.github/workflows/ci.yml`).

## Stack

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Express · @google/genai · express-rate-limit · vitest · lucide-react
