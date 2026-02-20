import {
  UnitSystem,
  formatDistance as ucFormatDistance,
  formatTotalDistance as ucFormatTotalDistance,
  formatPaceFromSpeed as ucFormatPaceFromSpeed,
} from './unitConversions';

/**
 * Format time in seconds to HH:MM:SS or MM:SS format
 */
export const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
};

/**
 * Format distance in meters to km or m (with optional unit system)
 */
export const formatDistance = (meters: number, units: UnitSystem = 'metric'): string => {
  return ucFormatDistance(meters, units);
};

/**
 * Format total distance (without decimals for km, with optional unit system)
 */
export const formatTotalDistance = (meters: number, units: UnitSystem = 'metric'): string => {
  return ucFormatTotalDistance(meters, units);
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
 * Format average pace from average speed (m/s) to min/km or min/mi
 */
export const formatAvgPace = (avgSpeed: number, units: UnitSystem = 'metric'): string => {
  return ucFormatPaceFromSpeed(avgSpeed, units);
};
