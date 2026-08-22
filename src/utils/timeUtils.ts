export interface TimeZoneOption {
  id: string;
  label: string;
  city: string;
  flag: string;
}

export const TIME_ZONES: TimeZoneOption[] = [
  { id: 'local', label: 'Local Time (Device)', city: 'Local', flag: '📍' },
  { id: 'Europe/Amsterdam', label: 'Amsterdam / Brussels', city: 'Amsterdam', flag: '🇳🇱' },
  { id: 'Europe/London', label: 'London / Dublin', city: 'London', flag: '🇬🇧' },
  { id: 'Europe/Berlin', label: 'Berlin / Frankfurt', city: 'Berlin', flag: '🇩🇪' },
  { id: 'Europe/Paris', label: 'Paris / Madrid', city: 'Paris', flag: '🇫🇷' },
  { id: 'America/New_York', label: 'New York (EDT/EST)', city: 'New York', flag: '🇺🇸' },
  { id: 'America/Los_Angeles', label: 'Los Angeles / SF (PDT/PST)', city: 'Los Angeles', flag: '🇺🇸' },
  { id: 'Asia/Tokyo', label: 'Tokyo (JST)', city: 'Tokyo', flag: '🇯🇵' },
  { id: 'Asia/Dubai', label: 'Dubai (GST)', city: 'Dubai', flag: '🇦🇪' },
  { id: 'Australia/Sydney', label: 'Sydney (AEST)', city: 'Sydney', flag: '🇦🇺' },
  { id: 'UTC', label: 'UTC / GMT Universal', city: 'UTC Universal', flag: '🌐' }
];

export function getLocalizedTimeZones(t: (key: any, fb?: string) => string): TimeZoneOption[] {
  return TIME_ZONES.map((tz) => {
    if (tz.id === 'local') {
      return {
        ...tz,
        city: t('tzLocal', 'Local'),
        label: t('tzLocalDevice', 'Local Time (Device)')
      };
    }
    if (tz.id === 'UTC') {
      return {
        ...tz,
        city: t('tzUniversal', 'Universal (UTC)'),
        label: t('tzUniversalDesc', 'UTC / GMT Universal')
      };
    }
    return tz;
  });
}

export function getTimeZoneCity(id: string, t?: (key: any, fb?: string) => string): string {
  if (id === 'local') {
    return t ? t('tzLocal', 'Local') : 'Local';
  }
  if (id === 'UTC') {
    return t ? t('tzUniversal', 'UTC Universal') : 'UTC Universal';
  }
  const found = TIME_ZONES.find((z) => z.id === id);
  return found ? found.city : id.split('/').pop()?.replace('_', ' ') || id;
}

export function getTimeZoneLabel(id: string, t?: (key: any, fb?: string) => string): string {
  if (id === 'local') {
    return t ? t('tzLocalDevice', 'Local Time (Device)') : 'Local Time (Device)';
  }
  if (id === 'UTC') {
    return t ? t('tzUniversalDesc', 'UTC / GMT Universal') : 'UTC / GMT Universal';
  }
  const found = TIME_ZONES.find((z) => z.id === id);
  return found ? found.label : id;
}

export function getZonedDate(date: Date, timeZone?: string): Date {
  if (!timeZone || timeZone === 'local') {
    return date;
  }

  try {
    const targetTimeStr = date.toLocaleString('en-US', { timeZone });
    return new Date(targetTimeStr);
  } catch (e) {
    return date;
  }
}

export function formatTimeDisplay(date: Date, format24h: boolean = true, showSeconds: boolean = true): string {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  let suffix = '';
  if (!format24h) {
    suffix = hours >= 12 ? ' PM' : ' AM';
    hours = hours % 12 || 12;
  }

  const hoursStr = hours.toString().padStart(2, '0');
  return `${hoursStr}:${minutes}${showSeconds ? `:${seconds}` : ''}${suffix}`;
}

export function formatDateDutch(date: Date, timeZone?: string): string {
  return formatDateLocale(date, 'nl', timeZone);
}

export function formatDateLocale(date: Date, lang: string = 'nl', timeZone?: string): string {
  const localeMap: Record<string, string> = {
    nl: 'nl-NL',
    en: 'en-US',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES'
  };

  const locale = localeMap[lang] || 'nl-NL';
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
    return date.toLocaleDateString(locale, options);
  }
}
