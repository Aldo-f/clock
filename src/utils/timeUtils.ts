export interface TimeZoneOption {
  id: string;
  label: string;
  city: string;
  flag: string;
}

export const TIME_ZONES: TimeZoneOption[] = [
  { id: 'local', label: 'Lokaal (Apparaat)', city: 'Mijn Locatie', flag: '📍' },
  { id: 'Europe/Amsterdam', label: 'Amsterdam / Brussel', city: 'Amsterdam', flag: '🇳🇱' },
  { id: 'Europe/London', label: 'Londen / Dublin', city: 'Londen', flag: '🇬🇧' },
  { id: 'America/New_York', label: 'New York (Oostkust)', city: 'New York', flag: '🇺🇸' },
  { id: 'America/Los_Angeles', label: 'Los Angeles / SF', city: 'Los Angeles', flag: '🇺🇸' },
  { id: 'Asia/Tokyo', label: 'Tokio (JST)', city: 'Tokio', flag: '🇯🇵' },
  { id: 'Asia/Dubai', label: 'Dubai (GST)', city: 'Dubai', flag: '🇦🇪' },
  { id: 'Australia/Sydney', label: 'Sydney (AEST)', city: 'Sydney', flag: '🇦🇺' },
  { id: 'UTC', label: 'UTC / GMT Standaard', city: 'Universeel', flag: '🌐' }
];

export function getZonedDate(date: Date, timeZone?: string): Date {
  if (!timeZone || timeZone === 'local') {
    return date;
  }

  try {
    const invdate = new Date(date.toLocaleString('en-US', { timeZone }));
    const diff = date.getTime() - invdate.getTime();
    // Return adjusted date object where getHours(), getMinutes(), etc. match the requested timezone
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
    return new Intl.DateTimeFormat('nl-NL', options).format(date);
  } catch (e) {
    return date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}
