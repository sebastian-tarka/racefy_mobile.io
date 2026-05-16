import { formatDurationCompact } from './formatDuration';
import type { GoalMetric, PaceStatus } from '../types/goals';
import type { UnitSystem } from './unitConversions';

/**
 * Conversion: user input in display units → SI integer for POST.
 *
 * - distance: km (metric) / miles (imperial) → metres
 * - duration: hours → seconds
 * - elevation: metres (metric) / feet (imperial) → metres
 * - activities_count: count (no conversion)
 */
export function inputToSi(value: number, metric: GoalMetric, units: UnitSystem): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  switch (metric) {
    case 'distance':
      return Math.round(units === 'imperial' ? value * 1609.344 : value * 1000);
    case 'duration':
      return Math.round(value * 3600);
    case 'elevation':
      return Math.round(units === 'imperial' ? value * 0.3048 : value);
    case 'activities_count':
      return Math.max(1, Math.round(value));
  }
}

/**
 * Inverse: SI from server → user input value (for prefilling form).
 */
export function siToInput(siValue: number, metric: GoalMetric, units: UnitSystem): number {
  switch (metric) {
    case 'distance':
      return units === 'imperial' ? siValue / 1609.344 : siValue / 1000;
    case 'duration':
      return siValue / 3600;
    case 'elevation':
      return units === 'imperial' ? siValue / 0.3048 : siValue;
    case 'activities_count':
      return siValue;
  }
}

/**
 * Unit label for the form input (shown as suffix).
 */
export function inputUnitLabel(metric: GoalMetric, units: UnitSystem): string {
  switch (metric) {
    case 'distance':
      return units === 'imperial' ? 'mi' : 'km';
    case 'duration':
      return 'h';
    case 'elevation':
      return units === 'imperial' ? 'ft' : 'm';
    case 'activities_count':
      return '';
  }
}

/**
 * Display formatted value from SI for read surfaces (cards, hero, history).
 */
export function formatMetricValue(siValue: number, metric: GoalMetric, units: UnitSystem): string {
  switch (metric) {
    case 'distance': {
      if (units === 'imperial') {
        const miles = siValue / 1609.344;
        return `${miles.toFixed(miles < 10 ? 2 : 1)} mi`;
      }
      const km = siValue / 1000;
      return `${km.toFixed(km < 10 ? 2 : 1)} km`;
    }
    case 'duration':
      return formatDurationCompact(siValue);
    case 'elevation':
      if (units === 'imperial') {
        const ft = siValue / 0.3048;
        return `${Math.round(ft)} ft`;
      }
      return `${Math.round(siValue)} m`;
    case 'activities_count':
      return String(siValue);
  }
}

/**
 * Colour for the pace-status chip — keep in sync with SPA `paceStatusColor()`.
 */
export function paceStatusColor(status: PaceStatus, theme: { primary: string; warning: string; textSecondary: string }): string {
  switch (status) {
    case 'completed':
    case 'ahead':
      return theme.primary;
    case 'behind':
      return theme.warning;
    case 'on_track':
    default:
      return theme.textSecondary;
  }
}
