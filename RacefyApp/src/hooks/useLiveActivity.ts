import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../services/api';
import type { Activity, GpsPoint } from '../types/api';

const isWeb = Platform.OS === 'web';

interface LiveActivityState {
  activity: Activity | null;
  isTracking: boolean;
  isPaused: boolean;
  isLoading: boolean;
  error: string | null;
  currentStats: {
    distance: number;
    duration: number;
    elevation_gain: number;
  };
}

export function useLiveActivity() {
  const [state, setState] = useState<LiveActivityState>({
    activity: null,
    isTracking: false,
    isPaused: false,
    isLoading: false,
    error: null,
    currentStats: { distance: 0, duration: 0, elevation_gain: 0 },
  });

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const pointsBuffer = useRef<GpsPoint[]>([]);
  const syncInterval = useRef<NodeJS.Timeout | null>(null);
  const localStatsRef = useRef({ distance: 0, duration: 0, elevation_gain: 0 });
  const lastPosition = useRef<{ lat: number; lng: number; ele?: number } | null>(null);

  // Haversine formula for distance calculation (fallback when offline)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Check for existing active activity on mount
  useEffect(() => {
    checkExistingActivity();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (syncInterval.current) {
        clearInterval(syncInterval.current);
      }
    };
  }, []);

  const checkExistingActivity = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const activity = await api.getCurrentActivity();
      if (activity) {
        setState((prev) => ({
          ...prev,
          activity,
          isTracking: activity.status === 'in_progress',
          isPaused: activity.status === 'paused',
          currentStats: {
            distance: activity.distance,
            duration: activity.duration,
            elevation_gain: activity.elevation_gain || 0,
          },
          isLoading: false,
        }));
        localStatsRef.current = {
          distance: activity.distance,
          duration: activity.duration,
          elevation_gain: activity.elevation_gain || 0,
        };

        // If activity is in progress, resume tracking
        if (activity.status === 'in_progress') {
          await startGpsTracking(activity.id);
        }
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Failed to check existing activity:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const startGpsTracking = async (activityId: number) => {
    if (isWeb) {
      console.log('GPS tracking not available on web');
      return;
    }

    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 10, // meters
          timeInterval: 5000, // ms
        },
        (location) => {
          const point: GpsPoint = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            ele: location.coords.altitude ?? undefined,
            time: new Date(location.timestamp).toISOString(),
            speed: location.coords.speed ?? undefined,
          };

          // Calculate local distance for immediate UI feedback
          if (lastPosition.current) {
            const dist = calculateDistance(
              lastPosition.current.lat,
              lastPosition.current.lng,
              point.lat,
              point.lng
            );
            if (dist > 2) {
              // Only count if moved more than 2 meters
              localStatsRef.current.distance += dist;

              // Calculate elevation gain
              if (point.ele && lastPosition.current.ele) {
                const elevDiff = point.ele - lastPosition.current.ele;
                if (elevDiff > 0) {
                  localStatsRef.current.elevation_gain += elevDiff;
                }
              }

              setState((prev) => ({
                ...prev,
                currentStats: { ...localStatsRef.current },
              }));
            }
          }

          lastPosition.current = { lat: point.lat, lng: point.lng, ele: point.ele };
          pointsBuffer.current.push(point);
        }
      );

      // Sync points to server every 30 seconds
      syncInterval.current = setInterval(() => syncPoints(activityId), 30000);
    } catch (error) {
      console.error('Failed to start GPS tracking:', error);
    }
  };

  const stopGpsTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    if (syncInterval.current) {
      clearInterval(syncInterval.current);
      syncInterval.current = null;
    }
  };

  const syncPoints = async (activityId: number) => {
    if (pointsBuffer.current.length === 0) return;

    const pointsToSync = [...pointsBuffer.current];
    pointsBuffer.current = [];

    try {
      const result = await api.addActivityPoints(activityId, pointsToSync);
      // Update with server-calculated stats (more accurate)
      localStatsRef.current = result.stats;
      setState((prev) => ({
        ...prev,
        currentStats: result.stats,
      }));
    } catch (error) {
      // Re-add points on failure
      pointsBuffer.current = [...pointsToSync, ...pointsBuffer.current];
      console.error('Failed to sync points:', error);
    }
  };

  const startTracking = useCallback(
    async (sportTypeId: number, title?: string) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Start activity on server
        const activity = await api.startLiveActivity({
          sport_type_id: sportTypeId,
          title,
          started_at: new Date().toISOString(),
        });

        // Reset local stats
        localStatsRef.current = { distance: 0, duration: 0, elevation_gain: 0 };
        lastPosition.current = null;
        pointsBuffer.current = [];

        setState((prev) => ({
          ...prev,
          activity,
          isTracking: true,
          isPaused: false,
          isLoading: false,
          currentStats: { distance: 0, duration: 0, elevation_gain: 0 },
        }));

        // Start GPS tracking
        await startGpsTracking(activity.id);

        return activity;
      } catch (error: any) {
        console.error('Failed to start activity:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to start activity',
        }));
        throw error;
      }
    },
    []
  );

  const pauseTracking = useCallback(async () => {
    if (!state.activity) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Stop GPS
      stopGpsTracking();

      // Sync remaining points
      await syncPoints(state.activity.id);

      // Pause on server
      const activity = await api.pauseActivity(state.activity.id);

      setState((prev) => ({
        ...prev,
        activity,
        isTracking: false,
        isPaused: true,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Failed to pause activity:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to pause activity',
      }));
      throw error;
    }
  }, [state.activity]);

  const resumeTracking = useCallback(async () => {
    if (!state.activity) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const activity = await api.resumeActivity(state.activity.id);

      setState((prev) => ({
        ...prev,
        activity,
        isTracking: true,
        isPaused: false,
        isLoading: false,
      }));

      // Restart GPS tracking
      await startGpsTracking(activity.id);
    } catch (error: any) {
      console.error('Failed to resume activity:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to resume activity',
      }));
      throw error;
    }
  }, [state.activity]);

  const finishTracking = useCallback(
    async (data?: { title?: string; description?: string; calories?: number }) => {
      if (!state.activity) return null;

      try {
        setState((prev) => ({ ...prev, isLoading: true }));

        // Stop GPS
        stopGpsTracking();

        // Sync remaining points
        await syncPoints(state.activity.id);

        // Finish on server
        const activity = await api.finishActivity(state.activity.id, {
          ...data,
          ended_at: new Date().toISOString(),
        });

        // Reset state
        localStatsRef.current = { distance: 0, duration: 0, elevation_gain: 0 };
        lastPosition.current = null;
        pointsBuffer.current = [];

        setState({
          activity: null,
          isTracking: false,
          isPaused: false,
          isLoading: false,
          error: null,
          currentStats: { distance: 0, duration: 0, elevation_gain: 0 },
        });

        return activity;
      } catch (error: any) {
        console.error('Failed to finish activity:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to finish activity',
        }));
        throw error;
      }
    },
    [state.activity]
  );

  const discardTracking = useCallback(async () => {
    if (!state.activity) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Stop GPS
      stopGpsTracking();

      // Discard on server
      await api.discardActivity(state.activity.id);

      // Reset state
      localStatsRef.current = { distance: 0, duration: 0, elevation_gain: 0 };
      lastPosition.current = null;
      pointsBuffer.current = [];

      setState({
        activity: null,
        isTracking: false,
        isPaused: false,
        isLoading: false,
        error: null,
        currentStats: { distance: 0, duration: 0, elevation_gain: 0 },
      });
    } catch (error: any) {
      console.error('Failed to discard activity:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to discard activity',
      }));
      throw error;
    }
  }, [state.activity]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    startTracking,
    pauseTracking,
    resumeTracking,
    finishTracking,
    discardTracking,
    clearError,
    checkExistingActivity,
  };
}
