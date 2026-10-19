/**
 * Live route geometry, split so a new GPS point does not re-send the whole track.
 *
 * A ShapeSource serializes its entire shape across the bridge on every update; after
 * two hours at 1 Hz that is ~7200 coordinates per point. The route is therefore drawn
 * from two sources: a "settled" part that only changes every ROUTE_SETTLE_EVERY points,
 * and a short live "tail" from the settled boundary to the newest point. The two share
 * the boundary point, so the line is continuous.
 *
 * Relies on the points array being append-only during a session (it is: the hook only
 * pushes, and replaces the array on reset).
 */
import type { GpsPoint } from '../types/api';

export const ROUTE_SETTLE_EVERY = 300;

type RoutePoint = Pick<GpsPoint, 'lat' | 'lng' | 'segment_break'>;

export interface RouteFeature {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: { type: 'MultiLineString'; coordinates: [number, number][][] };
}

/** Index of the last settled point (0 while the whole route still fits in the tail). */
export function settledBoundary(count: number): number {
  if (count < 2) return 0;
  return Math.floor((count - 1) / ROUTE_SETTLE_EVERY) * ROUTE_SETTLE_EVERY;
}

/**
 * Points [from, to] (inclusive) as a MultiLineString split at `segment_break` points
 * (bridged GPS gaps): the distance across a gap counts in the stats, but the map must
 * not draw a straight line through it. Null when there is no drawable segment.
 */
export function routeFeature(points: RoutePoint[], from: number, to: number): RouteFeature | null {
  const segments: [number, number][][] = [];
  let current: [number, number][] = [];

  for (let i = Math.max(0, from); i <= to && i < points.length; i++) {
    const p = points[i];
    if (p.segment_break && current.length > 0) {
      if (current.length >= 2) segments.push(current);
      current = [];
    }
    current.push([p.lng, p.lat]);
  }
  if (current.length >= 2) segments.push(current);

  if (segments.length === 0) return null;
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'MultiLineString', coordinates: segments },
  };
}
