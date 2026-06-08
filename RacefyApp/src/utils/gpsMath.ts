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
