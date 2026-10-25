import { UnitSystem, formatDistance as ucFormatDistance } from './unitConversions';
import { formatIntlDate } from './dateFormat';

/**
 * Format time in seconds to HH:MM:SS or MM:SS format
 */
export const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format distance in meters to km or m (with optional unit system)
 */
export const formatDistance = (meters: number, units: UnitSystem = 'metric'): string => {
  return ucFormatDistance(meters, units);
};

/**
 * Format total time with hours or minutes only
 */
export const formatTotalTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}h`;
  }
  return `${mins}m`;
};

/**
 * Format price with currency symbol using device locale
 */
export const formatPrice = (amount: number, currency: string = 'PLN'): string => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
};

/** Short day and month in the device locale: "Oct 19" / "19 paź". Empty for no date. */
export const formatShortDate = (dateString?: string): string => {
  if (!dateString) return '';
  return formatIntlDate(dateString, { month: 'short', day: 'numeric' });
};
