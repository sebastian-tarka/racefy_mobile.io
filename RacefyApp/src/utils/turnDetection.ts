/**
 * Derives turn-by-turn instructions from raw route geometry.
 *
 * Used as a fallback when a route has no router-generated `turn_instructions`
 * (e.g. nearby routes, which are raw GPS tracks of past activities). The track is
 * first simplified (Douglas–Peucker, metric tolerance) to strip GPS jitter, then
 * heading changes between consecutive simplified legs are classified. Consecutive
 * vertices close to each other are clustered so a sweeping corner made of several
 * small bends still counts as one turn.
 *
 * Coordinates follow GeoJSON convention: [lng, lat].
 */

import type { RouteTurnInstruction } from '../types/api';
import { bearing, haversine } from './routeNavigation';

export type DerivedManeuver = 'turn-left' | 'turn-right' | 'sharp-left' | 'sharp-right' | 'u-turn';

export interface TurnLabels {
  left: string;
  right: string;
  sharpLeft?: string;
  sharpRight?: string;
  uTurn: string;
}

export interface DeriveTurnOptions {
  /** Douglas–Peucker tolerance in meters (GPS noise below this is ignored) */
  simplifyToleranceM?: number;
  /** Both legs around a vertex must be at least this long to count (meters) */
  minLegM?: number;
  /** Minimum absolute heading change to announce a turn (degrees) */
  minAngleDeg?: number;
  /** Heading change from which a turn is "sharp" (degrees) */
  sharpAngleDeg?: number;
  /** Heading change from which a turn is a U-turn (degrees) */
  uTurnAngleDeg?: number;
  /** Vertices closer than this (along the track) are merged into one turn (meters) */
  clusterWindowM?: number;
}

const DEFAULTS: Required<DeriveTurnOptions> = {
  simplifyToleranceM: 8,
  minLegM: 12,
  minAngleDeg: 45,
  sharpAngleDeg: 110,
  uTurnAngleDeg: 150,
  clusterWindowM: 30,
};

/** Normalize a heading delta to (-180, 180]. Positive = clockwise (right). */
export function headingDelta(fromBearing: number, toBearing: number): number {
  let d = toBearing - fromBearing;
  while (d > 180) d -= 360;
  while (d <= -180) d += 360;
  return d;
}

export function classifyManeuver(
  deltaDeg: number,
  opts: Pick<Required<DeriveTurnOptions>, 'minAngleDeg' | 'sharpAngleDeg' | 'uTurnAngleDeg'>,
): DerivedManeuver | null {
  const abs = Math.abs(deltaDeg);
  if (abs < opts.minAngleDeg) return null;
  if (abs >= opts.uTurnAngleDeg) return 'u-turn';
  const right = deltaDeg > 0;
  if (abs >= opts.sharpAngleDeg) return right ? 'sharp-right' : 'sharp-left';
  return right ? 'turn-right' : 'turn-left';
}

function labelFor(maneuver: DerivedManeuver, labels: TurnLabels): string {
  switch (maneuver) {
    case 'turn-left':
      return labels.left;
    case 'turn-right':
      return labels.right;
    case 'sharp-left':
      return labels.sharpLeft ?? labels.left;
    case 'sharp-right':
      return labels.sharpRight ?? labels.right;
    case 'u-turn':
      return labels.uTurn;
  }
}

/**
 * Cumulative distance along the track for every vertex (meters).
 */
function cumulativeDistances(coords: [number, number][]): number[] {
  const out = new Array<number>(coords.length);
  out[0] = 0;
  for (let i = 1; i < coords.length; i++) {
    out[i] = out[i - 1] + haversine(coords[i - 1], coords[i]);
  }
  return out;
}

/**
 * Douglas–Peucker simplification returning indices of kept vertices.
 * Works in a local equirectangular projection so the tolerance is in meters.
 */
export function simplifyIndices(coords: [number, number][], toleranceM: number): number[] {
  const n = coords.length;
  if (n <= 2) return coords.map((_, i) => i);

  const lat0 = (coords[0][1] * Math.PI) / 180;
  const kx = 111320 * Math.cos(lat0);
  const ky = 110540;
  const xs = coords.map((c) => c[0] * kx);
  const ys = coords.map((c) => c[1] * ky);

  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;

  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    if (b - a < 2) continue;

    const ax = xs[a];
    const ay = ys[a];
    const dx = xs[b] - ax;
    const dy = ys[b] - ay;
    const len2 = dx * dx + dy * dy;

    let maxDist = -1;
    let maxIdx = -1;
    for (let i = a + 1; i < b; i++) {
      const px = xs[i] - ax;
      const py = ys[i] - ay;
      let dist: number;
      if (len2 === 0) {
        dist = Math.hypot(px, py);
      } else {
        const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
        dist = Math.hypot(px - t * dx, py - t * dy);
      }
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    if (maxDist > toleranceM) {
      keep[maxIdx] = 1;
      stack.push([a, maxIdx], [maxIdx, b]);
    }
  }

  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(i);
  return out;
}

/**
 * Derive turn instructions from a polyline.
 * Returns instructions sorted by `distance_along` (meters from start).
 */
export function deriveTurnInstructions(
  coords: [number, number][],
  labels: TurnLabels,
  options: DeriveTurnOptions = {},
): RouteTurnInstruction[] {
  const opts = { ...DEFAULTS, ...options };
  if (!coords || coords.length < 3) return [];

  const cum = cumulativeDistances(coords);
  const idx = simplifyIndices(coords, opts.simplifyToleranceM);
  if (idx.length < 3) return [];

  // Per-vertex heading change on the simplified polyline
  interface Bend {
    index: number; // original vertex index
    delta: number;
  }
  const bends: Bend[] = [];
  for (let k = 1; k < idx.length - 1; k++) {
    const prev = coords[idx[k - 1]];
    const cur = coords[idx[k]];
    const next = coords[idx[k + 1]];
    if (haversine(prev, cur) < opts.minLegM || haversine(cur, next) < opts.minLegM) continue;
    const delta = headingDelta(bearing(prev, cur), bearing(cur, next));
    bends.push({ index: idx[k], delta });
  }

  // Cluster bends that are close along the track (sweeping corners, roundabouts)
  const turns: RouteTurnInstruction[] = [];
  let i = 0;
  while (i < bends.length) {
    let sum = bends[i].delta;
    let anchor = bends[i];
    let j = i + 1;
    while (
      j < bends.length &&
      cum[bends[j].index] - cum[bends[j - 1].index] <= opts.clusterWindowM
    ) {
      sum += bends[j].delta;
      if (Math.abs(bends[j].delta) > Math.abs(anchor.delta)) anchor = bends[j];
      j++;
    }

    const maneuver = classifyManeuver(sum, opts);
    if (maneuver) {
      // Announce at the first vertex of the cluster so the prompt precedes the bend
      const first = bends[i];
      turns.push({
        distance_along: Math.round(cum[first.index]),
        maneuver,
        instruction: labelFor(maneuver, labels),
        location: coords[anchor.index],
      });
    }
    i = j;
  }

  return turns;
}
