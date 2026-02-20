/**
 * Unit conversion and formatting utilities for metric/imperial support.
 *
 * All functions are pure — no React dependencies.
 * Internal calculations remain metric; these functions handle display formatting only.
 */

export type UnitSystem = 'metric' | 'imperial';

// Conversion constants
const KM_TO_MI = 0.621371;
const M_TO_FT = 3.28084;
const MPS_TO_KMH = 3.6;
const MPS_TO_MPH = 2.23694;

// --- Distance ---

/**
 * Format distance in meters → "5.23 km" / "3.25 mi" (2 decimals for ≥1km, else meters/feet)
 */
export function formatDistance(meters: number, units: UnitSystem): string {
  if (units === 'imperial') {
    const miles = (meters / 1000) * KM_TO_MI;
    if (miles >= 0.1) {
      return `${miles.toFixed(2)} mi`;
    }
    return `${Math.round(meters * M_TO_FT)} ft`;
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format distance with 1 decimal → "5.2 km" / "3.3 mi"
 */
export function formatDistanceShort(meters: number, units: UnitSystem): string {
  if (units === 'imperial') {
    const miles = (meters / 1000) * KM_TO_MI;
    if (miles >= 0.1) {
      return `${miles.toFixed(1)} mi`;
    }
    return `${Math.round(meters * M_TO_FT)} ft`;
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format distance with 0 decimals → "5 km" / "3 mi"
 */
export function formatTotalDistance(meters: number, units: UnitSystem): string {
  if (units === 'imperial') {
    const miles = (meters / 1000) * KM_TO_MI;
    return `${Math.round(miles)} mi`;
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(0)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format distance when the input is already in km (e.g., API `distance_km` fields)
 */
export function formatDistanceFromKm(km: number, units: UnitSystem): string {
  if (units === 'imperial') {
    return `${(km * KM_TO_MI).toFixed(1)} mi`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Format distance from km with 0 decimals
 */
export function formatDistanceFromKmRounded(km: number, units: UnitSystem): string {
  if (units === 'imperial') {
    return `${Math.round(km * KM_TO_MI)} mi`;
  }
  return `${Math.round(km)} km`;
}

/**
 * Get raw distance value from meters (no unit suffix) — for split display
 */
export function getDistanceValue(meters: number, units: UnitSystem): number {
  if (units === 'imperial') {
    return (meters / 1000) * KM_TO_MI;
  }
  return meters / 1000;
}

/**
 * Get raw distance value from km (no unit suffix)
 */
export function getDistanceValueFromKm(km: number, units: UnitSystem): number {
  if (units === 'imperial') {
    return km * KM_TO_MI;
  }
  return km;
}

// --- Elevation ---

/**
 * Format elevation → "123 m" / "404 ft"
 */
export function formatElevation(meters: number, units: UnitSystem): string {
  if (units === 'imperial') {
    return `${Math.round(meters * M_TO_FT)} ft`;
  }
  return `${Math.round(meters)} m`;
}

// --- Speed ---

/**
 * Format speed from m/s → "10.5 km/h" / "6.5 mph"
 */
export function formatSpeed(mps: number, units: UnitSystem): string {
  if (units === 'imperial') {
    return `${(mps * MPS_TO_MPH).toFixed(1)} mph`;
  }
  return `${(mps * MPS_TO_KMH).toFixed(1)} km/h`;
}

// --- Pace ---

/**
 * Format pace from avg speed (m/s) → "5:42" (no unit suffix).
 * Returns "--:--" for invalid input.
 */
export function formatPaceFromSpeed(avgSpeedMps: number, units: UnitSystem): string {
  if (!avgSpeedMps || avgSpeedMps === 0 || !isFinite(avgSpeedMps)) return '--:--';

  // seconds per km
  const secPerKm = 1000 / avgSpeedMps;

  if (units === 'imperial') {
    // Convert sec/km to sec/mi
    const secPerMi = secPerKm / KM_TO_MI;
    const mins = Math.floor(secPerMi / 60);
    const secs = Math.floor(secPerMi % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format pace from distance (meters) and time (seconds) → "5:42" (no unit suffix).
 */
export function formatPaceFromDistanceTime(
  meters: number,
  seconds: number,
  units: UnitSystem
): string {
  if (!meters || meters === 0 || !seconds || seconds === 0) return '--:--';

  // seconds per km
  const secPerKm = (seconds / meters) * 1000;

  if (units === 'imperial') {
    const secPerMi = secPerKm / KM_TO_MI;
    const mins = Math.floor(secPerMi / 60);
    const secs = Math.floor(secPerMi % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format pace with unit suffix → "5:42 /km" / "9:11 /mi"
 */
export function formatPaceWithUnit(
  meters: number,
  seconds: number,
  units: UnitSystem
): string {
  const pace = formatPaceFromDistanceTime(meters, seconds, units);
  if (pace === '--:--') return pace;
  return `${pace} ${getPaceUnit(units)}`;
}

/**
 * Format pace from seconds-per-km value (used by paceCalculator) → "5:42" (no unit suffix).
 */
export function formatPaceFromSecPerKm(
  secondsPerKm: number | null,
  units: UnitSystem,
  placeholder: string = '--:--'
): string {
  if (secondsPerKm === null || !isFinite(secondsPerKm)) return placeholder;
  if (secondsPerKm < 60 || secondsPerKm > 1800) return placeholder;

  let displaySeconds = secondsPerKm;
  if (units === 'imperial') {
    displaySeconds = secondsPerKm / KM_TO_MI;
  }

  const mins = Math.floor(displaySeconds / 60);
  const secs = Math.floor(displaySeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// --- Temperature ---

/**
 * Format temperature → "22°C" / "72°F"
 */
export function formatTemperature(celsius: number, units: UnitSystem): string {
  if (units === 'imperial') {
    const fahrenheit = Math.round(celsius * 9 / 5 + 32);
    return `${fahrenheit}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

// --- Unit labels ---

export function getDistanceUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'mi' : 'km';
}

export function getSmallDistanceUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'ft' : 'm';
}

export function getElevationUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'ft' : 'm';
}

export function getSpeedUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'mph' : 'km/h';
}

export function getPaceUnit(units: UnitSystem): string {
  return units === 'imperial' ? '/mi' : '/km';
}

export function getTemperatureUnit(units: UnitSystem): string {
  return units === 'imperial' ? '°F' : '°C';
}

/**
 * Get the split label (for chart axes, split tables)
 */
export function getSplitLabel(units: UnitSystem): string {
  return units === 'imperial' ? 'Mile' : 'Kilometer';
}

// --- Milestone labels ---

/**
 * Convert milestone keys to display labels with correct units.
 * Milestone keys are API constants (first_5km, etc.) — only the display changes.
 */
const MILESTONE_DISTANCES: Record<string, { km: number }> = {
  '5': { km: 5 },
  '10': { km: 10 },
  '15': { km: 15 },
  '21.1': { km: 21.1 },
  '30': { km: 30 },
  '42.2': { km: 42.2 },
  '50': { km: 50 },
  '100': { km: 100 },
};

export function getMilestoneLabel(key: string, units: UnitSystem): string {
  const entry = MILESTONE_DISTANCES[key];
  if (!entry) return key;

  if (units === 'imperial') {
    const miles = entry.km * KM_TO_MI;
    // Use 1 decimal for half/full marathon, 0 for round numbers
    const isRound = miles === Math.round(miles);
    return `${isRound ? Math.round(miles) : miles.toFixed(1)} mi`;
  }

  // Metric: keep original label format
  const isRound = entry.km === Math.round(entry.km);
  return `${isRound ? Math.round(entry.km) : entry.km} km`;
}
