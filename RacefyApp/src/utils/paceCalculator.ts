/**
 * Pace calculation utilities for activity tracking.
 *
 * Provides functions for:
 * - Calculating current pace from recent GPS segments
 * - Applying exponential smoothing for stable display
 * - Formatting pace values for display
 */

/**
 * Represents a GPS segment with timestamp and cumulative distance.
 * Used to track distance progress over time for pace calculations.
 */
export interface PaceSegment {
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Cumulative distance in meters at this point */
  distance: number;
}

/**
 * Calculate current pace from recent GPS segments.
 *
 * Uses a rolling window approach: takes the oldest and newest segments
 * within the window and calculates pace from the distance/time delta.
 *
 * @param segments - Array of pace segments (should be sorted by timestamp)
 * @param windowSeconds - Time window in seconds to consider (e.g., 30-60s)
 * @param minSegmentDistance - Minimum distance delta in meters required for valid pace
 * @returns Pace in seconds per kilometer, or null if insufficient data
 */
export function calculateCurrentPace(
  segments: PaceSegment[],
  windowSeconds: number,
  minSegmentDistance: number
): number | null {
  if (segments.length < 2) {
    return null;
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const cutoffTime = now - windowMs;

  // Filter segments within the time window
  const windowSegments = segments.filter(s => s.timestamp >= cutoffTime);

  if (windowSegments.length < 2) {
    // Not enough segments in window, fall back to all available segments
    // but only if the total timespan is reasonable (< 2x window)
    const oldest = segments[0];
    const newest = segments[segments.length - 1];
    const timespan = newest.timestamp - oldest.timestamp;

    if (timespan > windowMs * 2 || timespan < 5000) {
      return null;
    }

    const distanceDelta = newest.distance - oldest.distance;
    const timeDeltaSeconds = timespan / 1000;

    if (distanceDelta < minSegmentDistance || timeDeltaSeconds < 5) {
      return null;
    }

    // Calculate pace: seconds per kilometer
    return (timeDeltaSeconds / distanceDelta) * 1000;
  }

  // Use segments within the window
  const oldest = windowSegments[0];
  const newest = windowSegments[windowSegments.length - 1];

  const distanceDelta = newest.distance - oldest.distance;
  const timeDeltaMs = newest.timestamp - oldest.timestamp;
  const timeDeltaSeconds = timeDeltaMs / 1000;

  // Validate minimum requirements
  if (distanceDelta < minSegmentDistance) {
    return null;
  }

  if (timeDeltaSeconds < 5) {
    // Need at least 5 seconds of data
    return null;
  }

  // Calculate pace: seconds per kilometer
  // pace = (time in seconds / distance in meters) * 1000 meters/km
  const paceSecondsPerKm = (timeDeltaSeconds / distanceDelta) * 1000;

  // Sanity check: pace should be between 1:00/km (world record) and 30:00/km (very slow walk)
  if (paceSecondsPerKm < 60 || paceSecondsPerKm > 1800) {
    return null;
  }

  return paceSecondsPerKm;
}

/**
 * Apply exponential moving average (EMA) smoothing to pace values.
 *
 * EMA formula: smoothed = alpha * current + (1 - alpha) * previous
 *
 * @param currentPace - Current raw pace in seconds/km
 * @param previousSmoothed - Previous smoothed pace value (or null for first value)
 * @param smoothingFactor - Alpha factor (0.1-0.9). Lower = smoother, higher = more responsive
 * @returns Smoothed pace value in seconds/km
 */
export function smoothPace(
  currentPace: number,
  previousSmoothed: number | null,
  smoothingFactor: number
): number {
  // Clamp smoothing factor to valid range
  const alpha = Math.max(0.1, Math.min(0.9, smoothingFactor));

  if (previousSmoothed === null) {
    return currentPace;
  }

  // Exponential moving average
  return alpha * currentPace + (1 - alpha) * previousSmoothed;
}

/**
 * Format pace value for display.
 *
 * @param secondsPerKm - Pace in seconds per kilometer, or null
 * @param placeholder - String to show when pace is null (default: "--:--")
 * @param units - Unit system for display conversion (default: 'metric')
 * @returns Formatted pace string (e.g., "5:42" or "--:--")
 */
export function formatPaceDisplay(
  secondsPerKm: number | null,
  placeholder: string = '--:--',
  units: 'metric' | 'imperial' = 'metric'
): string {
  if (secondsPerKm === null || !isFinite(secondsPerKm)) {
    return placeholder;
  }

  // Sanity bounds: 1:00/km to 30:00/km
  if (secondsPerKm < 60 || secondsPerKm > 1800) {
    return placeholder;
  }

  let displaySeconds = secondsPerKm;
  if (units === 'imperial') {
    // Convert sec/km to sec/mi (1 mi ≈ 1.60934 km)
    displaySeconds = secondsPerKm / 0.621371;
  }

  const minutes = Math.floor(displaySeconds / 60);
  const seconds = Math.floor(displaySeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate average pace from total distance and duration.
 *
 * @param durationSeconds - Total activity duration in seconds
 * @param distanceMeters - Total distance in meters
 * @param minDistance - Minimum distance required (default: 50m)
 * @returns Average pace in seconds/km, or null if insufficient distance
 */
export function calculateAveragePace(
  durationSeconds: number,
  distanceMeters: number,
  minDistance: number = 50
): number | null {
  if (distanceMeters < minDistance || durationSeconds < 1) {
    return null;
  }

  // pace = (seconds / meters) * 1000 = seconds per km
  const paceSecondsPerKm = (durationSeconds / distanceMeters) * 1000;

  // Sanity check
  if (paceSecondsPerKm < 60 || paceSecondsPerKm > 1800) {
    return null;
  }

  return paceSecondsPerKm;
}

/**
 * Add a new segment to the buffer, maintaining a maximum size.
 *
 * @param buffer - Existing segments array
 * @param newSegment - New segment to add
 * @param maxSegments - Maximum number of segments to keep (default: 30)
 * @returns Updated segments array
 */
export function addPaceSegment(
  buffer: PaceSegment[],
  newSegment: PaceSegment,
  maxSegments: number = 30
): PaceSegment[] {
  const updated = [...buffer, newSegment];

  // Trim if over max size
  if (updated.length > maxSegments) {
    return updated.slice(-maxSegments);
  }

  return updated;
}

/**
 * Trim segments to only include those within a time window.
 *
 * @param segments - Array of pace segments
 * @param windowSeconds - Time window in seconds
 * @returns Filtered segments array
 */
export function trimSegmentsToWindow(
  segments: PaceSegment[],
  windowSeconds: number
): PaceSegment[] {
  const cutoffTime = Date.now() - (windowSeconds * 1000);
  return segments.filter(s => s.timestamp >= cutoffTime);
}
