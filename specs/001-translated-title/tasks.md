---
description: "Tasks for feature 001-translated-title"
---

# Tasks: Translated Browser `<title>` (i18n)

**Input**: Design documents from `specs/001-translated-title/`

**Prerequisites**: plan.md (required), spec.md (required)

**Tests**: Verification is evidence-based (repo has no JS test runner): lint + real runtime
curl/DOM checks per AGENTS.md. Marked [V] below.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Owning user story (US1–US3); INFRA = deployment story
- Paths are relative to `~/dev/06-apps-clock/` unless prefixed

## Phase 3.1 — US1: translated, reactive document title

- [ ] T001 [US1] Add required key `pageTitle: string` to `TranslationDictionary`
      (`src/i18n/types.ts`, Navigation & General UI block).
- [ ] T002 [US1] Add `pageTitle` entries to all five languages in
      `src/i18n/translations.ts`:
      nl "Clocky - Digitale klok studio" · en "Clocky - Digital Clock Studio" ·
      de "Clocky - Digitales Uhrenstudio" · fr "Clocky - Studio d'horloges numériques" ·
      es "Clocky - Estudio de relojes digitales".
- [ ] T003 [US1] In `src/i18n/LanguageContext.tsx`: add a `useEffect` depending on
      `[language]` that sets `document.title = t('pageTitle')`, reading the active view from
      the route helper so fullscreen/dashboard/library compositions stay intact.
- [ ] V004 [US1] Run `npm run lint`; start `npm run dev`; curl the app; verify title changes
      for each of nl/en/de/fr/es (headless DOM read), including after switching language live.

## Phase 3.2 — US2: remove hard-coded title strings

- [ ] T005 [US2] Refactor `src/utils/urlRouter.ts`: export a pure composer that builds the
      full title from (tab, fullscreenClockName | null, translatedParts) — no string literals;
      update its callers in `src/App.tsx`.
- [ ] T006 [US2] Add view-title dictionary keys used by the composer and translate them in all
      five languages.
- [ ] V007 [US2] `grep -rn "Clocky — AI\|Multiklok Dashboard — Clocky\|Digital Clock Studio"
      src/` returns only i18n data files; `npm run lint` passes.

## Phase 3.3 — US3: server-rendered fallback honors ?lang=

- [ ] T008 [US3] In `server.ts` production branch: serve index.html from memory with a
      localized `<title>` when `?lang=`/`?l=` matches a supported code (nl/en/de/fr/es),
      default nl otherwise; keep SPA fallback behavior for all routes.
- [ ] V009 [US3] curl evidence: `/` → nl title; `/?lang=de` → de title; `/dashboard?lang=es` →
      es title; unknown `/?lang=xx` → nl fallback; asset/API routes unaffected.

## Phase 3.4 — INFRA: expose at http://clock.dev.aldof.duckdns.org/

- [x] T010 [INFRA] `docker-compose.yml` **lives in this repo** (stantonius
      convention): builds from local Dockerfile, container `clocky`, internal port
      3000, `traefik_net` only, healthcheck on `/api/community-clocks`, optional
      `.env` for `GEMINI_API_KEY`.
- [x] T011 [INFRA] Route is data-driven from
      `01-core-infra/ansible/roles/containers/defaults/main.yml`:
      `traefik_backends.clocky = http://clocky:3000` + `traefik_routes` entry
      `{ name: clock, host: clock.dev.aldof.duckdns.org, middlewares: [ipAllowList] }`.
      (Clocky is NOT in `container_services` — its compose is repo-owned.)
- [x] T012 [INFRA] Playbook renders routes via `routes.yml.j2`; no lineinfile, no
      hand-edits to runtime `04-network-traefik/routes.yml`.
- [x] T013 [INFRA] Multi-stage Dockerfile (pinned node:22-bookworm-slim) builds the
      production bundle in-image; runner ships dist + node_modules (esbuild
      `--packages=external` requires them); `NODE_ENV=production` serves dist.
- [x] V014 [INFRA] Playbook run green; idempotent re-run shows `changed=0 failed=0`.
- [x] V015 [INFRA] End-to-end verified live: HTTP→HTTPS 301; HTTPS 200 with localized
      `<title>` per ?lang=; regression sweep of existing hosts all healthy.

## Notes

- Port 3000 stays fixed (house convention); no host port published. A `PORT` env
  override exists in server.ts because the Pi host :3000 is occupied by the
  homepage container during local verification.
- Container joins `traefik_net`; Traefik reaches it as `http://clocky:3000`.
- Commit clock submodule + push to Aldo-f/clock, then bump pointer in `~/dev`.
