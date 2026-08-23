# Feature Specification: Translated Browser `<title>` (i18n)

**Feature Branch**: `001-translated-title`

**Created**: 2026-08-22

**Status**: Draft

**Input**: User description: "The <title>Translated</title> should also be translated. Currently this is not the case."

## Clarifications

### Session 2026-08-22

- Q: Which languages must the title support? → A: All five supported app languages (nl, en, de, fr, es).
- Q: Should the static HTML fallback title also be localized? → A: Yes — server-rendered `<title>` matches the `?lang=` URL parameter when present; client-side React takes over immediately on hydration.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Title reflects the selected language (Priority: P1)

A user switches the Clocky UI language (via the language picker, a persisted cookie/localStorage
preference, or the `?lang=`/`?l=` URL parameter). The browser tab title must display in that same
language instead of remaining a hard-coded string. Today `index.html` ships
`<title>Clocky - Digital Clock Studio</title>` and no code path ever updates it from the i18n
layer, so e.g. a Dutch user always sees an English tab title.

**Why this priority**: This is the core defect. Without it, the document title is untranslated
in every language and the feature has no value.

**Independent Test**: Load the app with `?lang=nl`, then switch to `en`, `de`, `fr`, `es` via the
picker; after each change read `document.title` and confirm it equals the per-language value.

**Acceptance Scenarios**:

1. **Given** a fresh browser with no stored preference, **When** the app loads with `?lang=de`,
   **Then** `document.title` is the German title.
2. **Given** a Dutch UI (`lang=nl`), **When** the user picks "English" in the language menu,
   **Then** `document.title` switches to the English title without a page reload.
3. **Given** a stored preference of `fr` (cookie or localStorage), **When** the app loads with no
   URL parameter, **Then** `document.title` is the French title.
4. **Given** any language state, **When** the user navigates to `/dashboard` or `/library` or
   opens a fullscreen clock route (`/clock/:id`), **Then** the title still follows the selected
   language (view suffix + translated base/app title).

---

### User Story 2 - No hard-coded copy outside the i18n layer (Priority: P2)

The title strings currently live as literals in `index.html` and `src/utils/urlRouter.ts`.
Per repo rule 6 ("i18n is mandatory for UI strings"), user-facing strings belong in
`src/i18n/translations.ts`. After this feature, all document-title text originates from the
translation dictionaries so future languages only require dictionary entries.

**Why this priority**: Keeps the fix maintainable and consistent with house rules, but the user-
visible outcome of US1 already works once this is done for titles.

**Independent Test**: `grep -rn "Clocky" src/ index.html` shows no un-localized title literal
outside translations data / fallback defaults documented in plan.md.

**Acceptance Scenarios**:

1. **Given** the repository, **When** searching source files for the old hard-coded title
   strings, **Then** none remain outside `src/i18n/translations.ts` (and the single static
   fallback in `index.html`, which US3 covers).
2. **Given** `npm run lint`, **When** it runs, **Then** it passes with no new type errors.

---

### User Story 3 - Server-rendered fallback honors `?lang=` (Priority: P3)

Before React hydrates (or with JS disabled), the served `index.html` contains a default-language
title. When the request carries a recognizable `?lang=`/`?l=` parameter, the Express server
renders the localized title server-side so there is no flash of the wrong language and the raw
HTML is correct.

**Why this priority**: Polish/SEO nicety; the client-side effect covers real usage. Ship last,
independently revertable.

**Independent Test**: `curl http://localhost:3000/?lang=de | grep "<title>"` returns the German
title; plain `/` returns the default (Dutch) title.

**Acceptance Scenarios**:

1. **Given** the production server running, **When** fetching `/` , **Then** the served HTML
   contains the default-language title.
2. **Given** the production server running, **When** fetching `/?lang=es`, **Then** the served
   HTML contains the Spanish title.

---

## Edge Cases

- Unsupported/unknown `?lang=xx` value: fall back to the default language title (nl), never an
  empty or key-like title (e.g. never render `title.pageTitle` or `undefined`).
- Missing translation entry for a language: fall back to the nl dictionary value.
- Very long clock names in fullscreen routes: title may truncate in browser UI; no action needed.
- SSR/hydration boundary: client effect runs after mount; server-injected title is replaced
  seamlessly (same value when parameters agree).

## Requirements *(mandatory)*

- **FR-1**: Each supported language (nl, en, de, fr, es) MUST have a translated document-title
  string in `TranslationDictionary`.
- **FR-2**: The document title MUST update reactively whenever the active language changes
  (picker, cookie/localStorage restore, or URL param), including on first load.
- **FR-3**: View-specific titles (dashboard, library, fullscreen clock) MUST keep working and
  compose view names with translated base/app title parts.
- **FR-4**: The Express server SHOULD inject the localized title into the served HTML when
  `?lang=`/`?l=` is present (US3).
- **FR-5**: No title-related user-facing strings may remain hard-coded in components/utils
  (house rule: i18n mandatory).

## Key Entities

- **TranslationDictionary** (`src/i18n/types.ts`): gains one required string key used for the
  main document title.
- **translations** (`src/i18n/translations.ts`): five entries, one per language.
- **LanguageContext** (`src/i18n/LanguageContext.tsx`): owns a reactive side-effect that keeps
  `document.title` in sync with language + current view state.
- **urlRouter** (`src/utils/urlRouter.ts`): supplies view-specific title composition but no
  longer owns hard-coded base strings.

## Review & Acceptance Checklist

- [ ] All 5 languages have title entries
- [ ] Language switch updates title live (no reload)
- [ ] Cookie/localStorage/URL-param restore paths all set the right title
- [ ] View routes keep composing titles correctly
- [ ] Server fallback honors `?lang=` (US3)
- [ ] `npm run lint` passes
