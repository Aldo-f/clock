import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Language, LanguageOption } from './types';
import { SUPPORTED_LANGUAGES, translations, TranslationDictionary } from './translations';
import { ClockItem } from '../types';
import { formatDateLocale as formatLocaleDate } from '../utils/timeUtils';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  resetToAutoDetect: () => void;
  isAutoDetected: boolean;
  showAutoDetectNotice: boolean;
  dismissAutoDetectNotice: () => void;
  detectedBrowserLang: Language;
  t: (key: keyof TranslationDictionary, fallback?: string) => string;
  translateCategory: (cat: string) => string;
  translateClock: (clock: ClockItem) => ClockItem;
  formatDateLocale: (date: Date, timeZone?: string) => string;
  languages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const SUPPORTED_CODES: Language[] = ['nl', 'en', 'de', 'fr', 'es'];

function matchLanguageCode(code: string | undefined | null): Language | null {
  if (!code) return null;
  const clean = code.toLowerCase().trim();
  const twoLetter = clean.slice(0, 2) as Language;
  if (SUPPORTED_CODES.includes(twoLetter)) {
    return twoLetter;
  }
  return null;
}

export function detectBrowserLanguage(): Language {
  try {
    if (typeof navigator !== 'undefined') {
      const candidates: string[] = [];
      if (Array.isArray(navigator.languages)) {
        candidates.push(...navigator.languages);
      }
      if (navigator.language) {
        candidates.push(navigator.language);
      }
      if ((navigator as any).userLanguage) {
        candidates.push((navigator as any).userLanguage);
      }

      for (const cand of candidates) {
        const matched = matchLanguageCode(cand);
        if (matched) {
          return matched;
        }
      }
    }
  } catch (e) {}

  return 'nl';
}

const PRESET_MAPPINGS: Record<string, { nameKey: keyof TranslationDictionary; descKey: keyof TranslationDictionary; catKey: keyof TranslationDictionary }> = {
  'clock-rotating-disc': { nameKey: 'presetDiscName', descKey: 'presetDiscDesc', catKey: 'catMechanical' },
  'clock-binary': { nameKey: 'presetBinaryName', descKey: 'presetBinaryDesc', catKey: 'catDigital' },
  'clock-marble-run': { nameKey: 'presetMarbleName', descKey: 'presetMarbleDesc', catKey: 'catMechanical' },
  'clock-color-palette': { nameKey: 'presetColorName', descKey: 'presetColorDesc', catKey: 'catArt' },
  'clock-word-dutch': { nameKey: 'presetWordName', descKey: 'presetWordDesc', catKey: 'catTypographic' },
  'clock-nixie': { nameKey: 'presetNixieName', descKey: 'presetNixieDesc', catKey: 'catRetro' },
  'clock-fibonacci': { nameKey: 'presetFibName', descKey: 'presetFibDesc', catKey: 'catMath' }
};

const CATEGORY_MAP: Record<string, keyof TranslationDictionary> = {
  'Alle': 'catAll',
  'All': 'catAll',
  'Mechanisch & uniek': 'catMechanical',
  'Mechanical & unique': 'catMechanical',
  'Digitaal & tech': 'catDigital',
  'Digital & tech': 'catDigital',
  'Minimalistisch': 'catMinimalist',
  'Minimalist': 'catMinimalist',
  'Retro & vintage': 'catRetro',
  'Kunst & sfeer': 'catArt',
  'Art & ambient': 'catArt',
  'Typografisch': 'catTypographic',
  'Typographic': 'catTypographic',
  'Wiskundig': 'catMath',
  'Mathematical': 'catMath',
  'Persoonlijk': 'catPersonal',
  'Personal': 'catPersonal',
  'Custom AI': 'catCustomAi',
  'Futuristisch': 'catDigital'
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [initData] = useState(() => {
    try {
      // 1. Priority #1: Check URL query param (?lang=en or ?l=en)
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = matchLanguageCode(urlParams.get('lang') || urlParams.get('l'));
        if (urlLang) {
          return { lang: urlLang, isAuto: false, showNotice: false };
        }
      }

      // 2. Priority #2: Check LocalStorage
      const stored = matchLanguageCode(localStorage.getItem('klokken_language'));
      if (stored) {
        return { lang: stored, isAuto: false, showNotice: false };
      }

      // 3. Auto-detect from browser setting
      const browserLang = detectBrowserLanguage();
      // Auto-detected on first visit: show subtle UX notice
      return { lang: browserLang, isAuto: true, showNotice: true };
    } catch (e) {
      return { lang: 'nl' as Language, isAuto: true, showNotice: false };
    }
  });

  const [language, setLanguageState] = useState<Language>(initData.lang);
  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(initData.isAuto);
  const [showAutoDetectNotice, setShowAutoDetectNotice] = useState<boolean>(initData.showNotice);
  const detectedBrowserLang = useMemo(() => detectBrowserLanguage(), []);

  // Synchronize document attributes & URL on language change
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  // Listen to popstate for browser history navigation with ?lang= parameter
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = matchLanguageCode(urlParams.get('lang') || urlParams.get('l'));
      if (urlLang && urlLang !== language) {
        setLanguageState(urlLang);
        setIsAutoDetected(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setIsAutoDetected(false);
    setShowAutoDetectNotice(false);

    try {
      // Persist to LocalStorage
      localStorage.setItem('klokken_language', lang);

      // Synchronize in URL query parameter without full reload
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('lang', lang);
        window.history.replaceState(
          { ...window.history.state, language: lang },
          document.title,
          url.pathname + url.search
        );
      }
    } catch (e) {}
  };

  const resetToAutoDetect = () => {
    const autoLang = detectBrowserLanguage();
    setLanguage(autoLang);
    setIsAutoDetected(true);
    setShowAutoDetectNotice(false);

    try {
      localStorage.removeItem('klokken_language');
    } catch (e) {}
  };

  const dismissAutoDetectNotice = () => {
    setShowAutoDetectNotice(false);
    // Mark preference to remember dismissal
    try {
      localStorage.setItem('klokken_language', language);
    } catch (e) {}
  };

  const t = (key: keyof TranslationDictionary, fallback?: string): string => {
    const dict = translations[language] || translations.nl;
    return (dict[key] as string) || fallback || (translations.nl[key] as string) || String(key);
  };

  const translateCategory = (cat: string): string => {
    const key = CATEGORY_MAP[cat];
    if (key) {
      return t(key);
    }
    return cat;
  };

  const translateClock = (clock: ClockItem): ClockItem => {
    if (clock.isBuiltIn && PRESET_MAPPINGS[clock.id]) {
      const mapping = PRESET_MAPPINGS[clock.id];
      return {
        ...clock,
        name: t(mapping.nameKey, clock.name),
        description: t(mapping.descKey, clock.description),
        category: t(mapping.catKey, clock.category)
      };
    }
    return clock;
  };

  const formatDateLocale = (date: Date, timeZone?: string): string =>
    formatLocaleDate(date, language, timeZone);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      resetToAutoDetect,
      isAutoDetected,
      showAutoDetectNotice,
      dismissAutoDetectNotice,
      detectedBrowserLang,
      t,
      translateCategory,
      translateClock,
      formatDateLocale,
      languages: SUPPORTED_LANGUAGES
    }),
    [language, isAutoDetected, showAutoDetectNotice, detectedBrowserLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
