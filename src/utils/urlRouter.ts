import { ClockItem } from '../types';

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
      const match = allClocks.find(
        (c) =>
          c.id.toLowerCase() === clockIdOrSlug.toLowerCase() ||
          c.id.toLowerCase() === `clock-${clockIdOrSlug.toLowerCase()}`
      );
      if (match) resolvedClockId = match.id;
      else resolvedClockId = clockIdOrSlug;
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
    const match = allClocks.find(
      (c) =>
        c.id.toLowerCase() === clockParam.toLowerCase() ||
        c.id.toLowerCase() === `clock-${clockParam.toLowerCase()}`
    );
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
 * Updates browser URL and document title without triggering page reloads.
 */
export function updateBrowserUrl(
  tab: 'gallery' | 'dashboard' | 'library',
  fullscreenClock: ClockItem | null,
  language?: string,
  replace: boolean = false
) {
  let targetPath = '/';
  let title = 'Clocky — AI & Horology Clock Studio';

  if (fullscreenClock) {
    targetPath = `/clock/${fullscreenClock.id}`;
    title = `${fullscreenClock.name} — Clocky`;
  } else if (tab === 'dashboard') {
    targetPath = '/dashboard';
    title = 'Multiklok Dashboard — Clocky';
  } else if (tab === 'library') {
    targetPath = '/library';
    title = 'Clock Library & Community — Clocky';
  } else {
    targetPath = '/';
    title = 'Clocky — AI & Horology Clock Studio';
  }

  // Maintain URL search params
  const currentParams = new URLSearchParams(window.location.search);
  
  if (fullscreenClock) {
    currentParams.delete('clock'); // Clean path /clock/:id already conveys this
  } else {
    currentParams.delete('clock');
  }

  if (language) {
    currentParams.set('lang', language);
  }

  const queryString = currentParams.toString();
  const fullTargetUrl = queryString ? `${targetPath}?${queryString}` : targetPath;
  const currentFullUrl = window.location.pathname + (window.location.search ? window.location.search : '');

  document.title = title;

  if (currentFullUrl !== fullTargetUrl) {
    if (replace) {
      window.history.replaceState({ tab, clockId: fullscreenClock?.id || null, language }, title, fullTargetUrl);
    } else {
      window.history.pushState({ tab, clockId: fullscreenClock?.id || null, language }, title, fullTargetUrl);
    }
  }
}
