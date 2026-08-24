export type Language = 'nl' | 'en' | 'de' | 'fr' | 'es';

export interface LanguageOption {
  code: Language;
  label: string;
  nativeName: string;
  flag: string;
}
