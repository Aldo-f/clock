# Development

## Environment variables

| Variable         | Required | Purpose                                          |
|------------------|----------|--------------------------------------------------|
| `GEMINI_API_KEY` | for AI   | Google Gemini API key (`@google/genai`)          |
| `APP_URL`        | no       | Public base URL, used for self-referential links |

`.env*` is gitignored; only `.env.example` is tracked. `dotenv` loads `.env` locally.

## Scripts

| Script          | What it does                                        |
|-----------------|-----------------------------------------------------|
| `npm run dev`   | `tsx server.ts` — Express + Vite dev server (:3000) |
| `npm run build` | Client bundle + bundled server (`dist/server.cjs`)  |
| `npm start`     | Run the production server                           |
| `npm run lint`  | `tsc --noEmit` type check — **run before claiming done** |
| `npm run clean` | Remove `dist/`                                      |

## API

| Method | Path                             | Description                              |
|--------|----------------------------------|------------------------------------------|
| POST   | `/api/generate-clock`            | Generate a clock style config via Gemini |
| GET    | `/api/community-clocks`          | List shared community clocks             |
| POST   | `/api/community-clocks`          | Share a clock config                     |
| POST   | `/api/community-clocks/:id/like` | Like a community clock                   |

## Conventions

- **Port discipline.** The server hard-codes port 3000; check `lsof -i :3000` first.
- **Adding a new clock:** create `src/components/clocks/<Name>Clock.tsx`, register it in
  `src/data/presetClocks.ts` and `ClockRenderer.tsx`, give it a stable lowercase id
  (routes resolve ids case-insensitively, also as `clock-<id>`).
- **i18n is mandatory** for UI strings — via `src/i18n/translations.ts`.
- **Secrets stay out of git.** Never commit keys.
- **Community store is in-memory.** Don't add features that assume persistence without
  adding real storage.
- `DISABLE_HMR=true` disables Vite HMR/file-watching (used by agents).

Originally scaffolded in Google AI Studio (`metadata.json`, `.env.example` reference AI
Studio injection); the repo works standalone too.
