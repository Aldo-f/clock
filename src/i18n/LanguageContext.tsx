import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Language, LanguageOption, TranslationDictionary } from './types';
import { SUPPORTED_LANGUAGES, translations } from './translations';
import { ClockItem } from '../types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationDictionary, fallback?: string) => string;
  translateCategory: (cat: string) => string;
  translateClock: (clock: ClockItem) => ClockItem;
  formatDateLocale: (date: Date, timeZone?: string) => string;
  languages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

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
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('klokken_language') as Language;
      if (saved && ['nl', 'en', 'de', 'fr', 'es'].includes(saved)) {
        return saved;
      }
      // Detect browser language
      const navLang = navigator.language?.slice(0, 2).toLowerCase();
      if (navLang === 'nl') return 'nl';
      if (navLang === 'de') return 'de';
      if (navLang === 'fr') return 'fr';
      if (navLang === 'es') return 'es';
      return 'nl'; // Default to Dutch
    } catch (e) {
      return 'nl';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('klokken_language', lang);
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

  const formatDateLocale = (date: Date, timeZone?: string): string => {
    const localeMap: Record<Language, string> = {
      nl: 'nl-NL',
      en: 'en-US',
      de: 'de-DE',
      fr: 'fr-FR',
      es: 'es-ES'
    };
    const locale = localeMap[language] || 'nl-NL';

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    if (timeZone && timeZone !== 'local') {
      options.timeZone = timeZone;
    }

    try {
      return new Intl.DateTimeFormat(locale, options).format(date);
    } catch (e) {
      return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      translateCategory,
      translateClock,
      formatDateLocale,
      languages: SUPPORTED_LANGUAGES
    }),
    [language]
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
