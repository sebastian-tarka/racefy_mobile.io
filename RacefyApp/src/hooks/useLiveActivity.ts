import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../services/api';
import type { Activity, GpsPoint } from '../types/api';

const isWeb = Platform.OS === 'web';

interface LiveActivityStats {
  distance: number;
  duration: number;
  elevation_gain: number;
  points_count: number;
  avg_speed: number;
  max_speed: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
}

interface LiveActivityState {
  activity: Activity | null;
  isTracking: boolean;
  isPaused: boolean;
  isLoading: boolean;
  error: string | null;
  currentStats: LiveActivityStats;
  // Flag to indicate there's an existing activity that needs user attention
  // (e.g., from app crash, phone died, etc.)
  hasExistingActivity: boolean;
}

const initialStats: LiveActivityStats = {
  distance: 0,
  duration: 0,
  elevation_gain: 0,
  points_count: 0,
  avg_speed: 0,
  max_speed: 0,
};

export function useLiveActivity() {
  const [state, setState] = useState<LiveActivityState>({
    activity: null,
    isTracking: false,
    isPaused: false,
    isLoading: false,
    error: null,
    currentStats: { ...initialStats },
    hasExistingActivity: false,
  });

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const pointsBuffer = useRef<GpsPoint[]>([]);
  const syncInterval = useRef<NodeJS.Timeout | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const localStatsRef = useRef<LiveActivityStats>({ ...initialStats });
  const lastPosition = useRef<{ lat: number; lng: number; ele?: number } | null>(null);
  const trackingStartTime = useRef<number | null>(null);
  const pausedDuration = useRef<number>(0);

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
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  const checkExistingActivity = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const activity = await api.getCurrentActivity();
      if (activity) {
        const stats: LiveActivityStats = {
          distance: activity.distance,
          duration: activity.duration,
          elevation_gain: activity.elevation_gain || 0,
          points_count: 0,
          avg_speed: activity.avg_speed || 0,
          max_speed: activity.max_speed || 0,
          avg_heart_rate: activity.avg_heart_rate || undefined,
          max_heart_rate: activity.max_heart_rate || undefined,
        };

        // Set hasExistingActivity flag to true - UI should show dialog
        // asking user to Resume/Finish/Discard
        setState((prev) => ({
          ...prev,
          activity,
          isTracking: false, // Don't auto-resume, let user decide
          isPaused: activity.status === 'paused',
          currentStats: stats,
          isLoading: false,
          hasExistingActivity: true,
        }));
        localStatsRef.current = stats;
        pausedDuration.current = activity.total_paused_duration || 0;

        // NOTE: We do NOT auto-resume GPS tracking here.
        // The UI should show a dialog and let user choose:
        // - Resume: call resumeTracking()
        // - Finish: call finishTracking()
        // - Discard: call discardTracking()
      } else {
        setState((prev) => ({ ...prev, isLoading: false, hasExistingActivity: false }));
      }
    } catch (error) {
      console.error('Failed to check existing activity:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Start local duration timer for real-time UI updates
  const startDurationTimer = (initialDuration: number = 0) => {
    trackingStartTime.current = Date.now() - (initialDuration * 1000);

    durationInterval.current = setInterval(() => {
      if (trackingStartTime.current) {
        const elapsed = Math.floor((Date.now() - trackingStartTime.current) / 1000);
        localStatsRef.current.duration = elapsed;
        setState((prev) => ({
          ...prev,
          currentStats: { ...prev.currentStats, duration: elapsed },
        }));
      }
    }, 1000);
  };

  // Stop duration timer
  const stopDurationTimer = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
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

      // Start duration timer
      startDurationTimer(localStatsRef.current.duration);
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
    stopDurationTimer();
  };

  const syncPoints = async (activityId: number) => {
    if (pointsBuffer.current.length === 0) return;

    const pointsToSync = [...pointsBuffer.current];
    pointsBuffer.current = [];

    try {
      const result = await api.addActivityPoints(activityId, pointsToSync);
      // Update with server-calculated stats (more accurate)
      const newStats: LiveActivityStats = {
        distance: result.stats.distance,
        duration: result.stats.duration,
        elevation_gain: result.stats.elevation_gain,
        points_count: result.stats.points_count,
        avg_speed: result.stats.avg_speed,
        max_speed: result.stats.max_speed,
        avg_heart_rate: result.stats.avg_heart_rate,
        max_heart_rate: result.stats.max_heart_rate,
      };
      localStatsRef.current = newStats;
      setState((prev) => ({
        ...prev,
        activity: result.data,
        currentStats: newStats,
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

        // IMPORTANT: Check for existing activity first!
        // Never call start blindly - the API will reject if one exists
        const existingActivity = await api.getCurrentActivity();
        if (existingActivity) {
          const stats: LiveActivityStats = {
            distance: existingActivity.distance,
            duration: existingActivity.duration,
            elevation_gain: existingActivity.elevation_gain || 0,
            points_count: 0,
            avg_speed: existingActivity.avg_speed || 0,
            max_speed: existingActivity.max_speed || 0,
            avg_heart_rate: existingActivity.avg_heart_rate || undefined,
            max_heart_rate: existingActivity.max_heart_rate || undefined,
          };
          setState((prev) => ({
            ...prev,
            activity: existingActivity,
            isLoading: false,
            hasExistingActivity: true,
            currentStats: stats,
          }));
          localStatsRef.current = stats;
          throw new Error('An activity is already in progress. Please finish or discard it first.');
        }

        // Start activity on server
        const activity = await api.startLiveActivity({
          sport_type_id: sportTypeId,
          title,
          started_at: new Date().toISOString(),
        });

        // Reset local stats
        localStatsRef.current = { ...initialStats };
        lastPosition.current = null;
        pointsBuffer.current = [];
        pausedDuration.current = 0;
        trackingStartTime.current = null;

        setState((prev) => ({
          ...prev,
          activity,
          isTracking: true,
          isPaused: false,
          isLoading: false,
          currentStats: { ...initialStats },
          hasExistingActivity: false,
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

      // Update paused duration from server
      pausedDuration.current = activity.total_paused_duration || 0;

      setState((prev) => ({
        ...prev,
        activity,
        isTracking: true,
        isPaused: false,
        isLoading: false,
        hasExistingActivity: false, // Clear the flag - user chose to resume
      }));

      // Restart GPS tracking (this also starts the duration timer)
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
        localStatsRef.current = { ...initialStats };
        lastPosition.current = null;
        pointsBuffer.current = [];
        pausedDuration.current = 0;
        trackingStartTime.current = null;

        setState({
          activity: null,
          isTracking: false,
          isPaused: false,
          isLoading: false,
          error: null,
          currentStats: { ...initialStats },
          hasExistingActivity: false,
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
      localStatsRef.current = { ...initialStats };
      lastPosition.current = null;
      pointsBuffer.current = [];
      pausedDuration.current = 0;
      trackingStartTime.current = null;

      setState({
        activity: null,
        isTracking: false,
        isPaused: false,
        isLoading: false,
        error: null,
        currentStats: { ...initialStats },
        hasExistingActivity: false,
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
