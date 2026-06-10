/**
 * Pure GPS math extracted from useLiveActivity (the 2376-line god-hook) so it can
 * be unit-tested in isolation and reused. No React, no refs, no side effects.
 */

export interface GpsBufferPoint {
  lat: number;
  lng: number;
  ele?: number;
  timestamp: number;
}

export interface SmoothedPosition {
  lat: number;
  lng: number;
  ele?: number;
  timestamp: number;
}

export interface TrackPoint {
  lat: number;
  lng: number;
  ele?: number;
}

export interface TrackDelta {
  distance: number;
  elevationGain: number;
}

/** A persisted/recovered point that still carries its capture time (ISO string). */
export interface RecoveredPoint {
  lat: number;
  lng: number;
  ele?: number;
  time?: string;
}

export interface RecoveredTrack {
  distance: number;
  elevationGain: number;
  /** Trailing (most recent) point, to re-seed lastPosition; null when there are no points. */
  lastPoint: { lat: number; lng: number; ele?: number; timestamp: number } | null;
  /** Timestamp (ms) of the trailing point, to re-seed the gap clock; null when empty. */
  lastTimestamp: number | null;
  /** Number of points considered (for logging). */
  count: number;
}

const EARTH_RADIUS_M = 6371e3;

/**
 * Great-circle distance between two lat/lng points, in metres (Haversine).
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

/**
 * Smoothed position from a GPS buffer. Lat/lng use a recency-weighted average
 * (newer points — higher index — weigh more, linear weights 1..n); elevation
 * uses the median to resist altitude outliers.
 *
 * Pure: the caller owns buffer push/shift sizing; this only reads the buffer.
 * The returned timestamp is the caller-supplied one (usually the newest point's).
 */
export function smoothPositionFromBuffer(
  buffer: GpsBufferPoint[],
  timestamp: number,
): SmoothedPosition {
  let totalWeight = 0;
  let weightedLat = 0;
  let weightedLng = 0;

  buffer.forEach((p, i) => {
    const weight = i + 1; // older = 1, newest = buffer length
    weightedLat += p.lat * weight;
    weightedLng += p.lng * weight;
    totalWeight += weight;
  });

  const avgLat = weightedLat / totalWeight;
  const avgLng = weightedLng / totalWeight;

  const elevations = buffer.filter((p) => p.ele !== undefined).map((p) => p.ele!);
  let avgEle: number | undefined;
  if (elevations.length > 0) {
    elevations.sort((a, b) => a - b);
    const mid = Math.floor(elevations.length / 2);
    avgEle =
      elevations.length % 2 === 0 ? (elevations[mid - 1] + elevations[mid]) / 2 : elevations[mid];
  }

  return { lat: avgLat, lng: avgLng, ele: avgEle, timestamp };
}

/**
 * Accumulate distance + elevation gain over a sequence of points, starting from
 * `startPoint` (e.g. the last known position). A segment's distance counts only
 * if it exceeds `minDistanceThreshold` (filters GPS jitter); elevation gain
 * counts only positive deltas above `minElevationChange`, and only when both
 * endpoints have an elevation.
 *
 * Pure — used by useLiveActivity's foreground reconciliation of background points.
 */
export function accumulateTrackDelta(
  points: TrackPoint[],
  startPoint: TrackPoint | null,
  minDistanceThreshold: number,
  minElevationChange: number,
): TrackDelta {
  let distance = 0;
  let elevationGain = 0;
  let prev = startPoint;

  for (const point of points) {
    if (prev) {
      const dist = haversineDistance(prev.lat, prev.lng, point.lat, point.lng);
      if (dist > minDistanceThreshold) {
        distance += dist;
        if (point.ele && prev.ele) {
          const elevDiff = point.ele - prev.ele;
          if (elevDiff > minElevationChange) {
            elevationGain += elevDiff;
          }
        }
      }
    }
    prev = { lat: point.lat, lng: point.lng, ele: point.ele };
  }

  return { distance, elevationGain };
}

/**
 * Rebuild distance + elevation gain from a set of recovered points (e.g. after an
 * app kill, or when server-derived stats came back as 0). The points are sorted by
 * time, then accumulated mirroring live filtering: a segment counts only when the
 * time gap to the previous point is within `gapThresholdMs` (so far-apart jumps
 * across a discontinuity are ignored) AND its distance exceeds `minDistanceThreshold`.
 * Elevation gain counts positive deltas above `minElevationChange` when both
 * endpoints report an elevation (zero is a valid elevation here, unlike
 * accumulateTrackDelta).
 *
 * Also returns the trailing point + its timestamp so the caller can re-seed
 * lastPosition and the gap clock. Pure.
 */
export function accumulateRecoveredTrack(
  points: RecoveredPoint[],
  minDistanceThreshold: number,
  minElevationChange: number,
  gapThresholdMs: number,
): RecoveredTrack {
  const toMs = (time?: string) => (time ? new Date(time).getTime() : 0);
  const ordered = [...points].sort((a, b) => toMs(a.time) - toMs(b.time));

  let distance = 0;
  let elevationGain = 0;
  let prev: { lat: number; lng: number; ele?: number; t: number } | null = null;
  let lastTimestamp: number | null = null;

  for (const p of ordered) {
    const t = toMs(p.time);
    if (prev && t - prev.t <= gapThresholdMs) {
      const dist = haversineDistance(prev.lat, prev.lng, p.lat, p.lng);
      if (dist > minDistanceThreshold) {
        distance += dist;
        if (p.ele != null && prev.ele != null) {
          const elevDiff = p.ele - prev.ele;
          if (elevDiff > minElevationChange) {
            elevationGain += elevDiff;
          }
        }
      }
    }
    prev = { lat: p.lat, lng: p.lng, ele: p.ele, t };
    lastTimestamp = t;
  }

  return {
    distance,
    elevationGain,
    lastPoint: prev ? { lat: prev.lat, lng: prev.lng, ele: prev.ele, timestamp: prev.t } : null,
    lastTimestamp,
    count: ordered.length,
  };
}
