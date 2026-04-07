/**
 * Pure utility functions for live route navigation.
 * All calculations are client-side using Haversine distance.
 * Coordinates follow GeoJSON convention: [lng, lat].
 */

import type { GeoJSONLineString, RouteTurnInstruction } from '../types/api';
import {
  OFF_ROUTE_WARNING_M,
  OFF_ROUTE_ALERT_M,
  TURN_ANNOUNCE_DISTANCE_M,
  TURN_PASSED_DISTANCE_M,
} from '../constants/navigation';

const EARTH_RADIUS_M = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Haversine distance between two [lng, lat] coordinates in meters.
 */
export function haversine(a: [number, number], b: [number, number]): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Find the nearest point on a route polyline to a given position.
 * Returns { index, point, distance, distanceAlong }.
 */
export function nearestPointOnRoute(
  position: [number, number], // [lng, lat]
  coordinates: [number, number][]
): {
  index: number;         // segment index (0-based)
  point: [number, number]; // nearest point [lng, lat]
  distance: number;      // distance from position to nearest point (meters)
  distanceAlong: number; // distance along route from start to nearest point (meters)
} {
  let bestDist = Infinity;
  let bestPoint: [number, number] = coordinates[0];
  let bestIndex = 0;
  let bestDistAlong = 0;
  let cumulativeDist = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const a = coordinates[i];
    const b = coordinates[i + 1];
    const segLen = haversine(a, b);

    // Project position onto segment a→b
    const projected = projectOntoSegment(position, a, b);
    const dist = haversine(position, projected.point);

    if (dist < bestDist) {
      bestDist = dist;
      bestPoint = projected.point;
      bestIndex = i;
      bestDistAlong = cumulativeDist + segLen * projected.fraction;
    }

    cumulativeDist += segLen;
  }

  return { index: bestIndex, point: bestPoint, distance: bestDist, distanceAlong: bestDistAlong };
}

/**
 * Project a point onto a line segment, returning the closest point and fraction along segment.
 */
function projectOntoSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): { point: [number, number]; fraction: number } {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];

  if (dx === 0 && dy === 0) {
    return { point: a, fraction: 0 };
  }

  // Use flat-earth approximation for projection (accurate enough for short segments)
  const px = p[0] - a[0];
  const py = p[1] - a[1];
  let t = (px * dx + py * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));

  return {
    point: [a[0] + t * dx, a[1] + t * dy],
    fraction: t,
  };
}

/**
 * Calculate total route distance in meters.
 */
export function routeTotalDistance(coordinates: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    total += haversine(coordinates[i - 1], coordinates[i]);
  }
  return total;
}

/**
 * Calculate remaining distance from current position to end of route.
 */
export function distanceRemaining(
  distanceAlong: number,
  totalDistance: number
): number {
  return Math.max(0, totalDistance - distanceAlong);
}

/**
 * Estimate time to finish based on current pace.
 * @param remainingMeters - distance remaining in meters
 * @param paceSecPerKm - current pace in seconds/km (null if unknown)
 * @returns estimated seconds to finish, or null
 */
export function estimateETA(
  remainingMeters: number,
  paceSecPerKm: number | null
): number | null {
  if (!paceSecPerKm || paceSecPerKm <= 0 || remainingMeters <= 0) return null;
  return Math.round((remainingMeters / 1000) * paceSecPerKm);
}

export type OffRouteStatus = 'on_route' | 'warning' | 'off_route';

/**
 * Determine off-route status based on distance from route.
 */
export function getOffRouteStatus(distanceFromRoute: number): OffRouteStatus {
  if (distanceFromRoute >= OFF_ROUTE_ALERT_M) return 'off_route';
  if (distanceFromRoute >= OFF_ROUTE_WARNING_M) return 'warning';
  return 'on_route';
}

/**
 * Get the next upcoming turn instruction based on distance along route.
 */
export function getNextTurn(
  distanceAlong: number,
  turnInstructions: RouteTurnInstruction[]
): RouteTurnInstruction | null {
  for (const turn of turnInstructions) {
    if (turn.distance_along > distanceAlong - TURN_PASSED_DISTANCE_M) {
      return turn;
    }
  }
  return null;
}

/**
 * Get distance to the next turn in meters.
 */
export function distanceToNextTurn(
  distanceAlong: number,
  nextTurn: RouteTurnInstruction | null
): number | null {
  if (!nextTurn) return null;
  return Math.max(0, nextTurn.distance_along - distanceAlong);
}

/**
 * Check if the next turn should be announced (within announce distance).
 */
export function shouldAnnounceTurn(
  distanceAlong: number,
  nextTurn: RouteTurnInstruction | null
): boolean {
  if (!nextTurn) return false;
  const dist = nextTurn.distance_along - distanceAlong;
  return dist > 0 && dist <= TURN_ANNOUNCE_DISTANCE_M;
}

/**
 * Calculate bearing from point A to point B in degrees (0-360).
 */
export function bearing(from: [number, number], to: [number, number]): number {
  const lat1 = toRad(from[1]);
  const lat2 = toRad(to[1]);
  const dLng = toRad(to[0] - from[0]);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
