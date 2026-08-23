# Implementation Plan: Translated Browser `<title>` (i18n)

**Branch**: `001-translated-title` | **Date**: 2026-08-22 | **Spec**: `specs/001-translated-title/spec.md`

**Input**: Feature specification from `specs/001-translated-title/spec.md`

## Summary

The browser tab title is hard-coded (`index.html`: "Clocky - Digital Clock Studio";
`src/utils/urlRouter.ts` composes English literals). Make the document title fully i18n-driven:
add a title string to all five translation dictionaries, keep `document.title` in sync
reactively from `LanguageContext` (language + view state), localize the view-name parts used by
`urlRouter`, and have the Express server inject the localized title into served HTML when
`?lang=`/`?l=` is present. Deployment on the homelab happens via the Ansible containers role
(new `templates/infra/06-apps-clock/`) plus a Traefik route for
`clock.dev.aldof.duckdns.org`.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Node (Express 4) server; Vite 6 middleware in dev

**Primary Dependencies**: react, react-dom, express, vite, tailwindcss v4

**Storage**: N/A (community store is in-memory; no persistence changes)

**Testing**: Manual runtime verification per repo AGENTS.md (`npm run lint` + real
`npm run dev` curl checks); spec-kit checklists. No JS test runner is configured — verification
is evidence-based (curl + grep of served HTML + headless DOM read).

**Target Platform**: Raspberry Pi 5 homelab, Docker behind Traefik (file-provider routes)

**Project Type**: web app (SPA + small Express API)

**Constraints**: Port 3000 fixed by convention (`server.ts`); container joins external
`traefik_net`; pinned image tags only; no nested git roots (submodule of `~/dev`)

**Scale/Scope**: Single-page app; ~5 source files touched; one new infra template dir; one new
Traefik route pair (+ service entry).

## Constitution Check

Repo-level rules (`~/dev/AGENTS.md`, `06-apps-clock/AGENTS.md`) as gates:

- ✅ i18n mandatory for UI strings → titles move into `translations.ts`
- ✅ Verify against real runtime → lint + dev-server curls + live-site checks before done
- ✅ Pinned images / template-first infra → compose template under
  `01-core-infra/templates/infra/06-apps-clock/`, image pinned by digest
- ✅ No edits to generated runtime dirs → routes.yml edited in templates only
- ✅ Idempotency → playbook re-run produces zero changes after success

## Project Structure

### Documentation (this feature)

```text
specs/001-translated-title/
├── spec.md          # User stories US1–US3 + requirements
├── plan.md          # This file
└── tasks.md         # Numbered, story-grouped task list
```

### Source Code (repository root)

```text
src/i18n/
├── types.ts              # TranslationDictionary: add pageTitle key
├── translations.ts       # nl/en/de/fr/es entries for pageTitle (+ view names)
└── LanguageContext.tsx   # useEffect syncing document.title to language+view
src/utils/
└── urlRouter.ts          # Accept translated base/app title strings (no literals)
index.html                # Static fallback stays default-language (nl)
server.ts                 # Inject localized <title> when ?lang= present (US3)
```

Infrastructure (sibling repos):

```text
~/dev/01-core-infra/templates/infra/06-apps-clock/docker-compose.yml   # NEW
~/dev/01-core-infra/templates/infra/04-network-traefik/routes.yml      # + clock route/service
~/dev/01-core-infra/ansible/roles/containers/defaults/main.yml         # + 06-apps-clock entry
```

## Design Decisions

1. **Single source of truth for the title**: a new required key `pageTitle` on
   `TranslationDictionary`. All five languages get an entry; `t('pageTitle')` resolves with nl
   fallback automatically via the existing helper.
2. **Reactive sync lives in LanguageContext**: a `useEffect` keyed on `[language]` sets
   `document.title`. It reads the current route state (tab/fullscreen clock via a lightweight
   getter exported from `urlRouter.ts`) so view-specific composition keeps working and updates
   on both language change and view change without duplicating logic.
3. **View names become translated too**: dashboard/library/base titles are composed from
   dictionary keys (e.g. `pageTitleDashboard`, `pageTitleLibrary`, `pageTitleApp`) instead of
   English literals in `urlRouter.ts`; fullscreen clocks keep `<clock name> — Clocky` shape
   using the clock's already-localized display name.
4. **Server-side injection is additive and safe (US3)**: production path currently does
   `res.sendFile(index.html)`; replace with reading the file once, then swapping the
   `<title>…</title>` text when a valid `?lang=`/`?l=` is present. Dev mode (Vite middleware)
   serves index.html itself; no change needed there beyond the client effect. Unknown languages
   fall through to the static default (nl).
5. **Deployment follows house pattern**: build a pinned-image Docker setup analogous to
   hermes-tq (compose builds from the submodule checkout), expose port 3000 only inside
   `traefik_net`, add router pair `clock-http` / `clock` for
   `Host(\`clock.dev.aldof.duckdns.org\`)` with https-redirect; `dev.*` hosts carry the
   ipAllowList middleware per existing convention.

## Risks & Mitigations

- *Hydration flash*: server injects correct title for URL-param users; everyone else gets the
  client effect within milliseconds of mount. Accepted.
- *GEMINI_API_KEY missing in container*: `/api/generate-clock` already has a local fallback
  engine; feature unaffected. `.env` support kept via compose `env_file`.
- *routes.yml regression risk*: edit only the canonical template; whole-file copy by the
  playbook (no lineinfile), then verify Traefik API/all existing hosts still return expected
  codes (regression sweep).
