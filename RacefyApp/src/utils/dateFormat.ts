/**
 * Dates in the app language (Settings → Language), not the phone's.
 *
 * Plain `format(date, 'MMM d')` and `toLocaleDateString()` without a locale use
 * English / the device locale, so a Polish user on an English phone saw
 * "Nov 1, 2026 9:00 AM". Use these helpers instead, and prefer the localized
 * date-fns tokens (`P`, `PP`, `p`, `PPp`…) or Intl options over hand-written
 * patterns: they also get the order and the 12/24 h clock right per language.
 */
import i18n from 'i18next';
import { format } from 'date-fns/format';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { pl } from 'date-fns/locale/pl';

type DateInput = Date | string | number;
type Locale = typeof enUS;

const DATE_FNS_LOCALES: Record<string, Locale> = { en: enUS, pl, es };

/** BCP 47 tag of the app language, for Intl / `toLocale*String`. */
export function getAppLocale(): string {
  return (i18n.language || 'en').split('-')[0];
}

function getDateFnsLocale(): Locale {
  return DATE_FNS_LOCALES[getAppLocale()] ?? enUS;
}

/** date-fns `format` in the app language. */
export function formatDate(date: DateInput, pattern: string): string {
  return format(new Date(date), pattern, { locale: getDateFnsLocale() });
}

/** "5 minutes ago" / "5 minut temu". */
export function formatTimeAgo(date: DateInput, { addSuffix = true } = {}): string {
  return formatDistanceToNow(new Date(date), { addSuffix, locale: getDateFnsLocale() });
}

/** `toLocaleDateString` in the app language — use for day/month without a year ("1 lis"). */
export function formatIntlDate(date: DateInput, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString(getAppLocale(), options);
}

export function formatIntlTime(date: DateInput, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleTimeString(getAppLocale(), options);
}

export function formatIntlDateTime(date: DateInput, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleString(getAppLocale(), options);
}

/** "1 Nov, 9:05 AM" / "1 lis, 09:05" — day, short month and time, no year. */
export const SHORT_DATE_TIME: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
};
