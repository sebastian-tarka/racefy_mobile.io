import { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import type {
  RouteWaypoint,
  PlannedRoute,
  RoutePreviewResponse,
  GeoJSONLineString,
  RouteTurnInstruction,
  RouteElevationPoint,
} from '../types/api';

interface RoutePlannerState {
  waypoints: RouteWaypoint[];
  profile: 'walking' | 'cycling';
  preview: {
    geometry: GeoJSONLineString | null;
    distance: number;
    estimatedDuration: number;
    elevationGain: number;
    elevationLoss: number;
    elevationProfile: RouteElevationPoint[];
    turnInstructions: RouteTurnInstruction[];
  };
  isLoadingPreview: boolean;
  isSaving: boolean;
  error: string | null;
}

interface PreviewState {
  geometry: GeoJSONLineString | null;
  distance: number;
  estimatedDuration: number;
  elevationGain: number;
  elevationLoss: number;
  elevationProfile: RouteElevationPoint[];
  turnInstructions: RouteTurnInstruction[];
}

const INITIAL_PREVIEW: PreviewState = {
  geometry: null,
  distance: 0,
  estimatedDuration: 0,
  elevationGain: 0,
  elevationLoss: 0,
  elevationProfile: [],
  turnInstructions: [],
};

export function useRoutePlanner() {
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [profile, setProfile] = useState<'walking' | 'cycling'>('walking');
  const [preview, setPreview] = useState(INITIAL_PREVIEW);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Undo stack
  const undoStack = useRef<RouteWaypoint[][]>([]);

  // Debounce timer ref
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPreview = useCallback(async (wps: RouteWaypoint[], prof: 'walking' | 'cycling') => {
    if (wps.length < 2) {
      setPreview(INITIAL_PREVIEW);
      return;
    }

    setIsLoadingPreview(true);
    setError(null);

    try {
      const response = await api.previewRoute({
        waypoints: wps,
        profile: prof,
      });

      setPreview({
        geometry: response.geometry,
        distance: response.distance,
        estimatedDuration: response.estimated_duration,
        elevationGain: response.elevation_gain,
        elevationLoss: response.elevation_loss,
        elevationProfile: response.elevation_profile,
        turnInstructions: response.turn_instructions,
      });
    } catch (err) {
      setError('Failed to calculate route');
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);

  const debouncedPreview = useCallback((wps: RouteWaypoint[], prof: 'walking' | 'cycling') => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
    }
    previewTimer.current = setTimeout(() => {
      fetchPreview(wps, prof);
    }, 400);
  }, [fetchPreview]);

  const addWaypoint = useCallback((lat: number, lng: number, label?: string) => {
    setWaypoints((prev) => {
      undoStack.current.push([...prev]);
      const newWps = [...prev, { lat, lng, label }];
      debouncedPreview(newWps, profile);
      return newWps;
    });
  }, [profile, debouncedPreview]);

  const removeWaypoint = useCallback((index: number) => {
    setWaypoints((prev) => {
      undoStack.current.push([...prev]);
      const newWps = prev.filter((_, i) => i !== index);
      debouncedPreview(newWps, profile);
      return newWps;
    });
  }, [profile, debouncedPreview]);

  const moveWaypoint = useCallback((index: number, lat: number, lng: number) => {
    setWaypoints((prev) => {
      const newWps = [...prev];
      newWps[index] = { ...newWps[index], lat, lng };
      debouncedPreview(newWps, profile);
      return newWps;
    });
  }, [profile, debouncedPreview]);

  const reorderWaypoints = useCallback((fromIndex: number, toIndex: number) => {
    setWaypoints((prev) => {
      undoStack.current.push([...prev]);
      const newWps = [...prev];
      const [moved] = newWps.splice(fromIndex, 1);
      newWps.splice(toIndex, 0, moved);
      debouncedPreview(newWps, profile);
      return newWps;
    });
  }, [profile, debouncedPreview]);

  const undo = useCallback(() => {
    const prevState = undoStack.current.pop();
    if (prevState) {
      setWaypoints(prevState);
      debouncedPreview(prevState, profile);
    }
  }, [profile, debouncedPreview]);

  const clearAll = useCallback(() => {
    undoStack.current.push([...waypoints]);
    setWaypoints([]);
    setPreview(INITIAL_PREVIEW);
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
    }
  }, [waypoints]);

  const changeProfile = useCallback((newProfile: 'walking' | 'cycling') => {
    setProfile(newProfile);
    if (waypoints.length >= 2) {
      debouncedPreview(waypoints, newProfile);
    }
  }, [waypoints, debouncedPreview]);

  const saveRoute = useCallback(async (title: string, sportTypeId: number, description?: string, isPublic?: boolean): Promise<PlannedRoute | null> => {
    if (waypoints.length < 2) {
      setError('At least 2 waypoints required');
      return null;
    }

    setIsSaving(true);
    setError(null);

    try {
      const route = await api.createRoute({
        title,
        description,
        sport_type_id: sportTypeId,
        profile,
        waypoints,
        is_public: isPublic,
      });
      return route;
    } catch (err) {
      setError('Failed to save route');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [waypoints, profile]);

  return {
    waypoints,
    profile,
    preview,
    isLoadingPreview,
    isSaving,
    error,
    canUndo: undoStack.current.length > 0,
    addWaypoint,
    removeWaypoint,
    moveWaypoint,
    reorderWaypoints,
    undo,
    clearAll,
    changeProfile,
    saveRoute,
  };
}
