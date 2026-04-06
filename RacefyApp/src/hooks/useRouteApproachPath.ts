import { useEffect, useRef, useState, useMemo } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { nearestPointOnRoute, routeTotalDistance } from '../utils/routeNavigation';
import type {
  GeoJSONLineString,
  RouteTurnInstruction,
  RoutePreviewResponse,
} from '../types/api';

interface Params {
  /** Original shadow track / route geometry */
  baseGeometry: GeoJSONLineString | null | undefined;
  /** Original turn instructions for the base route (if any) */
  baseTurnInstructions?: RouteTurnInstruction[];
  /** Stable id of the base route — used to invalidate cache */
  routeId: number | null | undefined;
  /** GPS position at the moment recording starts */
  startPosition: { lat: number; lng: number } | null;
  /** True once recording has started — triggers the fetch one time */
  isRecording: boolean;
  /** Mapbox profile */
  profile?: 'walking' | 'cycling';
  /** Skip the approach fetch if user is already this close to the route (meters) */
  snapThresholdM?: number;
}

interface ApproachState {
  status: 'idle' | 'fetching' | 'ready' | 'error' | 'snapped';
  /** Combined geometry: approach path prepended to base route (or base if snapped/error) */
  geometry: GeoJSONLineString | null;
  /** Combined turn instructions with offsets applied */
  turnInstructions: RouteTurnInstruction[];
  /** Total distance of merged route (meters) */
  totalDistance: number;
  /** Distance of just the approach segment (meters) */
  approachDistance: number;
  error: string | null;
}

const INITIAL: ApproachState = {
  status: 'idle',
  geometry: null,
  turnInstructions: [],
  totalDistance: 0,
  approachDistance: 0,
  error: null,
};

export function useRouteApproachPath({
  baseGeometry,
  baseTurnInstructions = [],
  routeId,
  startPosition,
  isRecording,
  profile = 'walking',
  snapThresholdM = 30,
}: Params): ApproachState {
  const [state, setState] = useState<ApproachState>(INITIAL);
  const fetchedKeyRef = useRef<string | null>(null);

  // Reset when route changes or recording stops
  useEffect(() => {
    if (!isRecording || !routeId) {
      if (fetchedKeyRef.current !== null) {
        fetchedKeyRef.current = null;
        setState(INITIAL);
      }
    }
  }, [isRecording, routeId]);

  useEffect(() => {
    if (!isRecording || !routeId || !baseGeometry?.coordinates?.length || !startPosition) return;

    const key = `${routeId}`;
    if (fetchedKeyRef.current === key) return;
    fetchedKeyRef.current = key;

    const baseCoords = baseGeometry.coordinates as [number, number][];
    const pos: [number, number] = [startPosition.lng, startPosition.lat];

    // Find where on the route the user should join
    const nearest = nearestPointOnRoute(pos, baseCoords);

    // If already on/near the route, skip the approach fetch and just trim
    if (nearest.distance <= snapThresholdM) {
      const trimmed = trimRouteFrom(baseCoords, nearest.index, nearest.point);
      const offset = nearest.distanceAlong;
      setState({
        status: 'snapped',
        geometry: { type: 'LineString', coordinates: trimmed },
        turnInstructions: shiftTurnsAfter(baseTurnInstructions, offset),
        totalDistance: routeTotalDistance(trimmed),
        approachDistance: 0,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, status: 'fetching', error: null }));

    let cancelled = false;
    (async () => {
      try {
        const joinPoint = nearest.point;
        const preview: RoutePreviewResponse = await api.previewRoute({
          waypoints: [
            { lat: startPosition.lat, lng: startPosition.lng, label: 'Start' },
            { lat: joinPoint[1], lng: joinPoint[0], label: 'Route' },
          ],
          profile,
        });
        if (cancelled) return;

        const approachCoords = (preview.geometry?.coordinates ?? []) as [number, number][];
        const trimmedBase = trimRouteFrom(baseCoords, nearest.index, nearest.point);

        // Avoid duplicating the join point
        const merged: [number, number][] = approachCoords.length
          ? [...approachCoords, ...trimmedBase.slice(1)]
          : trimmedBase;

        const approachDistance = preview.distance ?? routeTotalDistance(approachCoords);
        const baseOffsetRemoved = nearest.distanceAlong;

        // Approach turns (already start at 0) + base turns shifted by approachDistance and rebased to nearest.distanceAlong
        const baseTurnsShifted = shiftTurnsAfter(baseTurnInstructions, baseOffsetRemoved).map(
          (t) => ({ ...t, distance_along: t.distance_along + approachDistance })
        );

        setState({
          status: 'ready',
          geometry: { type: 'LineString', coordinates: merged },
          turnInstructions: [...(preview.turn_instructions ?? []), ...baseTurnsShifted],
          totalDistance: routeTotalDistance(merged),
          approachDistance,
          error: null,
        });
        logger.info('activity', 'Route approach path ready', {
          routeId,
          approachDistance,
          totalDistance: routeTotalDistance(merged),
          turns: (preview.turn_instructions?.length ?? 0) + baseTurnsShifted.length,
        });
      } catch (err: any) {
        if (cancelled) return;
        logger.warn('activity', 'Route approach fetch failed, falling back to raw route', {
          error: err?.message,
        });
        // Fallback: use raw base geometry from nearest point
        const trimmed = trimRouteFrom(baseCoords, nearest.index, nearest.point);
        setState({
          status: 'error',
          geometry: { type: 'LineString', coordinates: trimmed },
          turnInstructions: shiftTurnsAfter(baseTurnInstructions, nearest.distanceAlong),
          totalDistance: routeTotalDistance(trimmed),
          approachDistance: 0,
          error: err?.message ?? 'approach_failed',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isRecording,
    routeId,
    baseGeometry,
    baseTurnInstructions,
    startPosition?.lat,
    startPosition?.lng,
    profile,
    snapThresholdM,
  ]);

  return state;
}

/**
 * Trim a route polyline so it starts from the given segment index + projected point.
 */
function trimRouteFrom(
  coords: [number, number][],
  index: number,
  startPoint: [number, number]
): [number, number][] {
  if (coords.length === 0) return [];
  if (index <= 0) return [startPoint, ...coords.slice(1)];
  return [startPoint, ...coords.slice(index + 1)];
}

/**
 * Drop turns we've already passed and rebase remaining `distance_along` to start at 0.
 */
function shiftTurnsAfter(
  turns: RouteTurnInstruction[],
  offsetMeters: number
): RouteTurnInstruction[] {
  if (!turns?.length) return [];
  return turns
    .filter((t) => t.distance_along >= offsetMeters - 1)
    .map((t) => ({ ...t, distance_along: Math.max(0, t.distance_along - offsetMeters) }));
}
