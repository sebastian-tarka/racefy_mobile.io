/**
 * GPS tracking policy — the pure decision logic that filters/classifies live GPS
 * points during an activity. Extracted from useLiveActivity (the 2200+ line
 * god-hook) so it can be unit-tested without React/expo. The hook keeps the
 * stateful refs + side effects and consults these helpers.
 *
 * Intended home for a future stateful GpsTracker (buffer + gap clock) as the
 * decomposition continues.
 */

import {
  haversineDistance,
  smoothPositionFromBuffer,
  type GpsBufferPoint,
  type SmoothedPosition,
} from '../utils/gpsMath';

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

/**
 * Stateful smoothing buffer: holds the last N raw GPS points and returns the
 * recency-weighted smoothed position on each add. First stateful piece carved out
 * of useLiveActivity — a plain class (no React/expo) so it is testable directly.
 */
export class GpsSmoothingBuffer {
  private buffer: GpsBufferPoint[] = [];

  /**
   * Push a raw point (evicting the oldest once the buffer exceeds `maxSize`) and
   * return the smoothed position over the current window.
   */
  add(point: GpsBufferPoint, maxSize: number): SmoothedPosition {
    this.buffer.push(point);
    if (this.buffer.length > maxSize) {
      this.buffer.shift();
    }
    return smoothPositionFromBuffer(this.buffer, point.timestamp);
  }

  /** Number of points currently buffered (for diagnostics/tests). */
  get size(): number {
    return this.buffer.length;
  }

  /** Reset the buffer (e.g. on start/stop/discard). */
  clear(): void {
    this.buffer = [];
  }
}

/** The classification verdict for a single live GPS point relative to the last baseline. */
export type GpsPointOutcome = 'accepted' | 'gap' | 'filtered-speed' | 'filtered-distance';

/** Position baseline the new point is measured against (smoothed lat/lng/ele + capture time). */
export interface GpsBaseline {
  lat: number;
  lng: number;
  ele?: number;
  /** Capture time (ms). Optional — falls back to a 3s interval when missing, matching legacy behaviour. */
  timestamp?: number;
}

/** The profile knobs that drive the per-point filter (structural subset of GpsProfile). */
export interface GpsClassifyProfile {
  minDistanceThreshold: number;
  maxRealisticSpeed: number;
  minElevationChange: number;
  stationarySpeedThreshold?: number;
}

/** Full decision for one point: the verdict, the deltas to apply, and diagnostics for logging. */
export interface GpsPointDecision {
  outcome: GpsPointOutcome;
  /** Metres between the baseline and the smoothed point (always computed). */
  distance: number;
  /** Metres to add to the running total — non-zero only when `accepted`. */
  distanceAdded: number;
  /** Metres to add to elevation gain — non-zero only when `accepted` and above the noise floor. */
  elevationAdded: number;
  /** Implied speed (m/s) over the interval, used to reject glitch jumps. */
  impliedSpeed: number;
  /** Seconds since the baseline reading (3s fallback when the baseline has no timestamp). */
  timeSinceLastPoint: number;
  /** The min-distance threshold actually applied (stricter while stationary). */
  effectiveMinDistance: number;
  /** Whether GPS reported a stationary speed (stricter drift filter in effect). */
  isStationary: boolean;
  /** Milliseconds since the last buffered point — drives gap detection and logging. */
  gapMs: number;
}

/**
 * Classify a single live GPS point against the last baseline: decide whether it is
 * accepted (and how much distance/elevation it contributes), a post-gap jump to
 * discard, or filtered for unrealistic speed / sub-threshold movement.
 *
 * Pure — the caller owns the stateful refs (baseline, gap clock, totals) and applies
 * the returned deltas. This is the decision core of the eventual stateful GpsTracker.
 */
export function classifyGpsPoint(params: {
  baseline: GpsBaseline;
  smoothedPoint: { lat: number; lng: number; ele?: number };
  currentTimestamp: number;
  lastBufferedPointTime: number | null;
  rawSpeed: number | null | undefined;
  profile: GpsClassifyProfile;
  gapThresholdMs: number;
}): GpsPointDecision {
  const {
    baseline,
    smoothedPoint,
    currentTimestamp,
    lastBufferedPointTime,
    rawSpeed,
    profile,
    gapThresholdMs,
  } = params;

  const stationary = isStationary(rawSpeed, profile.stationarySpeedThreshold ?? 0.5);
  const effectiveMinDistance = computeEffectiveMinDistance(stationary, profile.minDistanceThreshold);

  const distance = haversineDistance(baseline.lat, baseline.lng, smoothedPoint.lat, smoothedPoint.lng);
  const timeSinceLastPoint = baseline.timestamp ? (currentTimestamp - baseline.timestamp) / 1000 : 3;
  const impliedSpeed = computeImpliedSpeed(distance, timeSinceLastPoint);
  const gapMs = lastBufferedPointTime !== null ? currentTimestamp - lastBufferedPointTime : 0;

  const base = {
    distance,
    impliedSpeed,
    timeSinceLastPoint,
    effectiveMinDistance,
    isStationary: stationary,
    gapMs,
  };

  if (distance <= effectiveMinDistance) {
    return { ...base, outcome: 'filtered-distance', distanceAdded: 0, elevationAdded: 0 };
  }
  if (impliedSpeed >= profile.maxRealisticSpeed) {
    return { ...base, outcome: 'filtered-speed', distanceAdded: 0, elevationAdded: 0 };
  }
  if (isGapPoint(lastBufferedPointTime, currentTimestamp, gapThresholdMs)) {
    return { ...base, outcome: 'gap', distanceAdded: 0, elevationAdded: 0 };
  }

  // Accepted: count the distance, plus elevation gain above the noise floor.
  let elevationAdded = 0;
  if (smoothedPoint.ele && baseline.ele) {
    const elevDiff = smoothedPoint.ele - baseline.ele;
    if (elevDiff > profile.minElevationChange) {
      elevationAdded = elevDiff;
    }
  }
  return { ...base, outcome: 'accepted', distanceAdded: distance, elevationAdded };
}

/** Profile knobs the per-point flow needs: smoothing window size + the classify fields. */
export interface GpsTrackerProfile extends GpsClassifyProfile {
  smoothingBufferSize: number;
}

/** Result of feeding one raw point through the tracker. */
export interface LivePointResult {
  /** The smoothed position over the current window (buffer always advances). */
  smoothedPoint: SmoothedPosition;
  /** The filter/gap/accept verdict, or null when there was no baseline yet (first point). */
  decision: GpsPointDecision | null;
}

/**
 * Stateful GPS positioning tracker: owns the three tightly-coupled pieces of
 * per-activity positioning state — the smoothing buffer, the last (smoothed)
 * baseline position, and the gap clock (timestamp of the last buffered point).
 *
 * Carved out of useLiveActivity so the per-point trajectory (smooth → classify →
 * advance baseline / gap clock) is a plain object, testable by feeding point
 * sequences. The hook keeps the running stats accumulator and side effects
 * (setState/logging/server buffers); it applies the deltas this returns.
 */
export class GpsTracker {
  private buffer = new GpsSmoothingBuffer();
  private baseline: GpsBaseline | null = null;
  private gapClock: number | null = null;

  /**
   * Feed one raw GPS reading. Always pushes it through the smoothing buffer; if a
   * baseline exists, classifies the smoothed point against it (and advances the gap
   * clock on accepted/gap, mirroring the live handler). The baseline is then advanced
   * to the smoothed position unconditionally, ready for the next reading.
   */
  addPoint(params: {
    raw: GpsBufferPoint;
    profile: GpsTrackerProfile;
    gapThresholdMs: number;
    rawSpeed: number | null | undefined;
  }): LivePointResult {
    const { raw, profile, gapThresholdMs, rawSpeed } = params;

    const smoothedPoint = this.buffer.add(raw, profile.smoothingBufferSize);

    let decision: GpsPointDecision | null = null;
    if (this.baseline) {
      decision = classifyGpsPoint({
        baseline: this.baseline,
        smoothedPoint,
        currentTimestamp: raw.timestamp,
        lastBufferedPointTime: this.gapClock,
        rawSpeed,
        profile,
        gapThresholdMs,
      });
      // The gap clock advances both when a point is counted and when a post-gap
      // jump is discarded — but not on speed/distance filtering.
      if (decision.outcome === 'accepted' || decision.outcome === 'gap') {
        this.gapClock = raw.timestamp;
      }
    }

    // Advance the baseline to the smoothed position for the next reading.
    this.baseline = {
      lat: smoothedPoint.lat,
      lng: smoothedPoint.lng,
      ele: smoothedPoint.ele,
      timestamp: raw.timestamp,
    };

    return { smoothedPoint, decision };
  }

  /** Push a point through the smoothing buffer without classifying (skip-first-after-resume baseline). */
  smooth(point: GpsBufferPoint, maxSize: number): SmoothedPosition {
    return this.buffer.add(point, maxSize);
  }

  /** The last baseline position (null before the first point / after a reset). */
  get lastPosition(): GpsBaseline | null {
    return this.baseline;
  }
  set lastPosition(position: GpsBaseline | null) {
    this.baseline = position;
  }

  /** The gap clock — timestamp (ms) of the last buffered point (null when unset). */
  get lastBufferedTime(): number | null {
    return this.gapClock;
  }
  set lastBufferedTime(timestamp: number | null) {
    this.gapClock = timestamp;
  }

  /** {lat,lng} of the current baseline, for the hook's currentPosition return value. */
  get currentPosition(): { lat: number; lng: number } | null {
    return this.baseline ? { lat: this.baseline.lat, lng: this.baseline.lng } : null;
  }

  /** Clear only the smoothing buffer (e.g. on start/resume to drop pre-pause positions). */
  clearBuffer(): void {
    this.buffer.clear();
  }
}
