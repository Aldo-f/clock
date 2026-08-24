import { ClockItem } from '../types';

/**
 * Finds a clock by ID case-insensitively, also matching the `clock-<id>` prefix form.
 * Returns the matched ClockItem or undefined if not found.
 */
function matchClockById(list: ClockItem[], rawId: string): ClockItem | undefined {
  const v = rawId.toLowerCase();
  return list.find(c => c.id.toLowerCase() === v || c.id.toLowerCase() === `clock-${v}`);
}

export interface RouteState {
  tab: 'gallery' | 'dashboard' | 'library';
  fullscreenClockId: string | null;
  language?: string;
  timeZone?: string;
  isEmbed?: boolean;
}

/**
 * Parses current window.location (pathname + query search) to determine application state.
 */
export function parseCurrentRoute(allClocks: ClockItem[]): RouteState {
  const path = window.location.pathname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);

  const clockParam = searchParams.get('clock') || searchParams.get('c');
  const tabParam = searchParams.get('tab') || searchParams.get('t');
  const langParam = searchParams.get('lang') || searchParams.get('l');
  const tzParam = searchParams.get('tz');
  const embedParam = searchParams.get('embed') === 'true';

  let resolvedClockId: string | null = null;
  let resolvedTab: 'gallery' | 'dashboard' | 'library' = 'gallery';

  // Check path patterns like /clock/:id or /dashboard or /library
  if (path.startsWith('/clock/')) {
    const clockIdOrSlug = path.replace('/clock/', '').trim();
    if (clockIdOrSlug) {
      const match = matchClockById(allClocks, clockIdOrSlug);
      resolvedClockId = match ? match.id : clockIdOrSlug;
    }
  } else if (path === '/dashboard' || path === '/multi' || tabParam === 'dashboard') {
    resolvedTab = 'dashboard';
  } else if (path === '/library' || path === '/community' || tabParam === 'library') {
    resolvedTab = 'library';
  } else if (path === '/gallery' || tabParam === 'gallery') {
    resolvedTab = 'gallery';
  }

  // Query parameter ?clock= overrides or complements
  if (clockParam) {
    const match = matchClockById(allClocks, clockParam);
    resolvedClockId = match ? match.id : clockParam;
  }

  return {
    tab: resolvedTab,
    fullscreenClockId: resolvedClockId,
    language: langParam || undefined,
    timeZone: tzParam || undefined,
    isEmbed: embedParam
  };
}

/**
 * Translated strings used to build the browser tab title.
 * Supplied by callers (i18n layer) so this module holds no copy.
 */
export interface DocumentTitleParts {
  /** Brand/app name, e.g. "Clocky". */
  appName: string;
  /** Gallery/base view title (translated, see pageTitle in translations.ts). */
  base: string;
  /** Dashboard view title. */
  dashboard: string;
  /** Library view title. */
  library: string;
}

/**
 * Purely composes the browser tab title from the active view plus
 * caller-supplied translated strings. All user-facing copy originates
 * from src/i18n/translations.ts (house rule: i18n mandatory).
 */
export function composeDocumentTitle(
  tab: 'gallery' | 'dashboard' | 'library',
  fullscreenClockName: string | null,
  parts: DocumentTitleParts
): string {
  if (fullscreenClockName) {
    return `${fullscreenClockName} — ${parts.appName}`;
  }
  if (tab === 'dashboard') {
    return parts.dashboard;
  }
  if (tab === 'library') {
    return parts.library;
  }
  return parts.base;
}

/**
 * Updates browser URL (and history entry) without triggering page reloads.
 * The document <title> itself is kept in sync by the i18n-driven effect in
 * App.tsx (see composeDocumentTitle).
 */
export function updateBrowserUrl(
  tab: 'gallery' | 'dashboard' | 'library',
  fullscreenClock: ClockItem | null,
  language?: string,
  replace: boolean = false
) {
  let targetPath = '/';

  if (fullscreenClock) {
    targetPath = `/clock/${fullscreenClock.id}`;
  } else if (tab === 'dashboard') {
    targetPath = '/dashboard';
  } else if (tab === 'library') {
    targetPath = '/library';
  } else {
    targetPath = '/';
  }

  // Maintain URL search params
  const currentParams = new URLSearchParams(window.location.search);
  
  currentParams.delete('clock');

  if (language) {
    currentParams.set('lang', language);
  }

  const queryString = currentParams.toString();
  const fullTargetUrl = queryString ? `${targetPath}?${queryString}` : targetPath;
  const currentFullUrl = window.location.pathname + (window.location.search ? window.location.search : '');

  // History state label only; the visible document <title> is owned by the
  // i18n effect in App.tsx (composeDocumentTitle).
  const historyTitle = document.title;

  if (currentFullUrl !== fullTargetUrl) {
    if (replace) {
      window.history.replaceState({ tab, clockId: fullscreenClock?.id || null, language }, historyTitle, fullTargetUrl);
    } else {
      window.history.pushState({ tab, clockId: fullscreenClock?.id || null, language }, historyTitle, fullTargetUrl);
    }
  }
}
