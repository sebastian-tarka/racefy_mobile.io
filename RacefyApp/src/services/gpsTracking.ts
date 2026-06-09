/**
 * GPS tracking policy — the pure decision logic that filters/classifies live GPS
 * points during an activity. Extracted from useLiveActivity (the 2200+ line
 * god-hook) so it can be unit-tested without React/expo. The hook keeps the
 * stateful refs + side effects and consults these helpers.
 *
 * Intended home for a future stateful GpsTracker (buffer + gap clock) as the
 * decomposition continues.
 */

/** Minimum metres a stationary point must move before it is counted at all. */
const DEFAULT_STATIONARY_MIN_DISTANCE_M = 8;

/** Implied speed (m/s) used when the time delta is non-positive — large enough
 * to be treated as an unrealistic glitch by callers. */
const NON_POSITIVE_DELTA_SPEED = 999;

/**
 * True when GPS reports a speed below the stationary threshold (so we should
 * apply a stricter movement filter to avoid accumulating drift while stopped).
 */
export function isStationary(
  speed: number | null | undefined,
  stationarySpeedThreshold: number,
): boolean {
  return speed != null && speed < stationarySpeedThreshold;
}

/**
 * The minimum-distance threshold to apply for the current point: stricter while
 * stationary (filters drift), the profile default otherwise.
 */
export function computeEffectiveMinDistance(
  stationary: boolean,
  minDistanceThreshold: number,
  stationaryMinDistance: number = DEFAULT_STATIONARY_MIN_DISTANCE_M,
): number {
  return stationary ? Math.max(minDistanceThreshold, stationaryMinDistance) : minDistanceThreshold;
}

/**
 * Implied speed (m/s) between two GPS readings. Returns a large sentinel when the
 * time delta is non-positive so callers reject it as an unrealistic jump.
 */
export function computeImpliedSpeed(distanceM: number, timeSeconds: number): number {
  return timeSeconds > 0 ? distanceM / timeSeconds : NON_POSITIVE_DELTA_SPEED;
}

/**
 * True when the time since the last buffered point exceeds the gap threshold —
 * i.e. the GPS track has a discontinuity (backgrounded, signal lost) and the
 * first point after it would create a visible jump, so it should be discarded.
 */
export function isGapPoint(
  lastBufferedPointTime: number | null,
  currentTimestamp: number,
  gapThresholdMs: number,
): boolean {
  return (
    lastBufferedPointTime !== null && currentTimestamp - lastBufferedPointTime > gapThresholdMs
  );
}
