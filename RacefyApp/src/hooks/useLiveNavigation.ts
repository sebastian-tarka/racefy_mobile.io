import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Vibration } from 'react-native';
import {
  nearestPointOnRoute,
  distanceRemaining as calcDistanceRemaining,
  estimateETA,
  getOffRouteStatus,
  getNextTurn,
  distanceToNextTurn,
  shouldAnnounceTurn,
  routeTotalDistance,
  type OffRouteStatus,
} from '../utils/routeNavigation';
import { OFF_ROUTE_CONFIRM_READINGS } from '../constants/navigation';
import type { PlannedRoute, RouteTurnInstruction } from '../types/api';

export interface NavigationState {
  /** Whether navigation is active */
  isActive: boolean;
  /** Distance from current position to route in meters */
  distanceFromRoute: number;
  /** Distance traveled along route in meters */
  distanceAlong: number;
  /** Distance remaining to end of route in meters */
  distanceRemaining: number;
  /** Total route distance in meters */
  totalDistance: number;
  /** Progress along route (0-1) */
  progress: number;
  /** Off-route status */
  offRouteStatus: OffRouteStatus;
  /** Confirmed off-route (after consecutive readings) */
  isOffRoute: boolean;
  /** Next upcoming turn instruction */
  nextTurn: RouteTurnInstruction | null;
  /** Distance to next turn in meters */
  distanceToTurn: number | null;
  /** Should announce next turn (within 200m) */
  shouldAnnounce: boolean;
  /** Estimated time to finish in seconds */
  eta: number | null;
}

const INITIAL_STATE: NavigationState = {
  isActive: false,
  distanceFromRoute: 0,
  distanceAlong: 0,
  distanceRemaining: 0,
  totalDistance: 0,
  progress: 0,
  offRouteStatus: 'on_route',
  isOffRoute: false,
  nextTurn: null,
  distanceToTurn: null,
  shouldAnnounce: false,
  eta: null,
};

interface UseLiveNavigationParams {
  /** The planned route to navigate */
  route: PlannedRoute | null;
  /** Current GPS position [lng, lat] */
  currentPosition: { lat: number; lng: number } | null;
  /** Current pace in seconds/km (from live activity stats) */
  currentPace: number | null;
  /** Whether the activity is actively recording */
  isRecording: boolean;
}

export function useLiveNavigation({
  route,
  currentPosition,
  currentPace,
  isRecording,
}: UseLiveNavigationParams): NavigationState {
  const [navState, setNavState] = useState<NavigationState>(INITIAL_STATE);
  const offRouteCounter = useRef(0);
  const lastAnnouncedTurnRef = useRef<number | null>(null);

  // Precompute route total distance
  const totalDistance = useMemo(() => {
    if (!route?.geometry?.coordinates) return 0;
    return routeTotalDistance(route.geometry.coordinates as [number, number][]);
  }, [route?.geometry]);

  // Update navigation state on each position change
  useEffect(() => {
    if (!route?.geometry?.coordinates || !currentPosition || !isRecording) {
      if (navState.isActive) {
        setNavState(INITIAL_STATE);
      }
      return;
    }

    const coords = route.geometry.coordinates as [number, number][];
    if (coords.length < 2) return;

    const pos: [number, number] = [currentPosition.lng, currentPosition.lat];

    // Find nearest point on route
    const nearest = nearestPointOnRoute(pos, coords);

    // Off-route detection with confirmation
    const status = getOffRouteStatus(nearest.distance);
    let confirmedOffRoute = false;

    if (status === 'off_route') {
      offRouteCounter.current++;
      if (offRouteCounter.current >= OFF_ROUTE_CONFIRM_READINGS) {
        confirmedOffRoute = true;
      }
    } else {
      offRouteCounter.current = 0;
    }

    // Haptic feedback on confirmed off-route
    if (confirmedOffRoute && !navState.isOffRoute) {
      Vibration.vibrate([0, 300, 100, 300]);
    }

    // Turn instructions
    const turnInstructions = route.turn_instructions || [];
    const nextTurn = getNextTurn(nearest.distanceAlong, turnInstructions);
    const distToTurn = distanceToNextTurn(nearest.distanceAlong, nextTurn);
    const announce = shouldAnnounceTurn(nearest.distanceAlong, nextTurn);

    // Haptic on turn announce (once per turn)
    if (announce && nextTurn) {
      const turnId = nextTurn.distance_along;
      if (lastAnnouncedTurnRef.current !== turnId) {
        lastAnnouncedTurnRef.current = turnId;
        Vibration.vibrate(200);
      }
    }

    const remaining = calcDistanceRemaining(nearest.distanceAlong, totalDistance);
    const eta = estimateETA(remaining, currentPace);

    setNavState({
      isActive: true,
      distanceFromRoute: Math.round(nearest.distance),
      distanceAlong: Math.round(nearest.distanceAlong),
      distanceRemaining: Math.round(remaining),
      totalDistance: Math.round(totalDistance),
      progress: totalDistance > 0 ? Math.min(1, nearest.distanceAlong / totalDistance) : 0,
      offRouteStatus: status,
      isOffRoute: confirmedOffRoute,
      nextTurn,
      distanceToTurn: distToTurn !== null ? Math.round(distToTurn) : null,
      shouldAnnounce: announce,
      eta,
    });
  }, [route, currentPosition, currentPace, isRecording, totalDistance]);

  return navState;
}
