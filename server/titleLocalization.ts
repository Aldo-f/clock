import { translations } from '../src/i18n/translations';
import { Language } from '../src/i18n/types';

const SUPPORTED_LANG_CODES: Language[] = ['nl', 'en', 'de', 'fr', 'es'];

/**
 * Resolves the localized document <title> from a ?lang=/?l= query value.
 * Returns null when absent/unsupported so callers fall back to the static
 * default-language HTML.
 */
export function localizedPageTitle(langValue: unknown): string | null {
  if (typeof langValue !== 'string') return null;
  const code = langValue.toLowerCase().trim().slice(0, 2) as Language;
  if (SUPPORTED_LANG_CODES.includes(code)) {
    return translations[code].pageTitle;
  }
  return null;
}

/**
 * Replaces the <title>…</title> element with the localized variant.
 * Unknown/absent language values leave the HTML unchanged (static nl default).
 */
export function injectLocalizedTitle(html: string, langValue: string): string {
  const title = localizedPageTitle(langValue);
  if (!title) return html;
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
}
