import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../services/api';
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  getAndClearLocationBuffer,
  setActiveActivityId,
  clearLocationBuffer,
} from '../services/backgroundLocation';
import type { Activity, GpsPoint } from '../types/api';
import { DEFAULT_GPS_PROFILE, convertToApiGpsProfile, type GpsProfile } from '../config/gpsProfiles';
import { useSportTypes } from './useSportTypes';
import { useAuth } from './useAuth';
import { logger } from '../services/logger';

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
  calories: number;
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
  calories: 0,
};

// Simple calorie estimation based on activity type and duration
// MET values: Running ~10, Cycling ~8, Swimming ~8, Gym ~5
const CALORIES_PER_SECOND = 0.15; // Rough average for moderate activity

export function useLiveActivity() {
  const { getGpsProfileForSport } = useSportTypes();
  const { isAuthenticated } = useAuth();

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
  const backgroundSyncInterval = useRef<NodeJS.Timeout | null>(null);
  const localStatsRef = useRef<LiveActivityStats>({ ...initialStats });
  const lastPosition = useRef<{ lat: number; lng: number; ele?: number; timestamp?: number } | null>(null);
  const trackingStartTime = useRef<number | null>(null);
  const pausedDuration = useRef<number>(0);
  const currentActivityId = useRef<number | null>(null);

  // GPS smoothing buffer - stores last N positions for averaging
  const gpsBuffer = useRef<Array<{ lat: number; lng: number; ele?: number; timestamp: number }>>([]);

  // Current GPS profile based on activity type
  const currentGpsProfile = useRef<GpsProfile>(DEFAULT_GPS_PROFILE);

  // Calculate smoothed position from GPS buffer
  const getSmoothedPosition = (newPoint: { lat: number; lng: number; ele?: number; timestamp: number }) => {
    const bufferSize = currentGpsProfile.current.smoothingBufferSize;
    gpsBuffer.current.push(newPoint);
    if (gpsBuffer.current.length > bufferSize) {
      gpsBuffer.current.shift();
    }

    // Calculate average of buffered points
    const buffer = gpsBuffer.current;
    const avgLat = buffer.reduce((sum, p) => sum + p.lat, 0) / buffer.length;
    const avgLng = buffer.reduce((sum, p) => sum + p.lng, 0) / buffer.length;

    // For elevation, use median to reduce outlier impact
    const elevations = buffer.filter(p => p.ele !== undefined).map(p => p.ele!);
    let avgEle: number | undefined;
    if (elevations.length > 0) {
      elevations.sort((a, b) => a - b);
      const mid = Math.floor(elevations.length / 2);
      avgEle = elevations.length % 2 === 0
        ? (elevations[mid - 1] + elevations[mid]) / 2
        : elevations[mid];
    }

    return { lat: avgLat, lng: avgLng, ele: avgEle, timestamp: newPoint.timestamp };
  };

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

  // Check for existing active activity on mount (only for authenticated users)
  useEffect(() => {
    if (isAuthenticated) {
      checkExistingActivity();
    }
  }, [isAuthenticated]);

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
      if (backgroundSyncInterval.current) {
        clearInterval(backgroundSyncInterval.current);
      }
    };
  }, []);

  const checkExistingActivity = async () => {
    try {
      logger.activity('Checking for existing activity');
      setState((prev) => ({ ...prev, isLoading: true }));
      const activity = await api.getCurrentActivity();
      if (activity) {
        logger.activity('Found existing activity', {
          id: activity.id,
          status: activity.status,
          sportTypeId: activity.sport_type_id,
        });
        const stats: LiveActivityStats = {
          distance: activity.distance,
          duration: activity.duration,
          elevation_gain: activity.elevation_gain || 0,
          points_count: 0,
          avg_speed: activity.avg_speed || 0,
          max_speed: activity.max_speed || 0,
          avg_heart_rate: activity.avg_heart_rate || undefined,
          max_heart_rate: activity.max_heart_rate || undefined,
          calories: activity.calories || 0,
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
        logger.activity('No existing activity found');
        setState((prev) => ({ ...prev, isLoading: false, hasExistingActivity: false }));
      }
    } catch (error) {
      logger.error('activity', 'Failed to check existing activity', { error });
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Start local duration timer for real-time UI updates
  const startDurationTimer = (initialDuration: number = 0, initialCalories: number = 0) => {
    trackingStartTime.current = Date.now() - (initialDuration * 1000);
    const baseCalories = initialCalories;

    durationInterval.current = setInterval(() => {
      if (trackingStartTime.current) {
        const elapsed = Math.floor((Date.now() - trackingStartTime.current) / 1000);
        // Calculate calories based on duration
        const calories = Math.floor(baseCalories + (elapsed - (localStatsRef.current.duration || 0)) * CALORIES_PER_SECOND);

        localStatsRef.current.duration = elapsed;
        localStatsRef.current.calories = Math.max(localStatsRef.current.calories, calories);

        setState((prev) => ({
          ...prev,
          currentStats: {
            ...prev.currentStats,
            duration: elapsed,
            calories: localStatsRef.current.calories,
          },
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

  // Sync points collected by background task
  const syncBackgroundPoints = async (activityId: number) => {
    try {
      const backgroundPoints = await getAndClearLocationBuffer();
      if (backgroundPoints.length > 0) {
        console.log(`Syncing ${backgroundPoints.length} background points`);
        // Convert to GpsPoint format and add to buffer
        const points: GpsPoint[] = backgroundPoints.map((p) => ({
          lat: p.lat,
          lng: p.lng,
          ele: p.ele,
          time: p.time,
          speed: p.speed,
        }));
        pointsBuffer.current.push(...points);
      }
    } catch (error) {
      console.error('Failed to sync background points:', error);
    }
  };

  const startGpsTracking = async (activityId: number, sportTypeId: number) => {
    if (isWeb) {
      logger.gps('GPS tracking not available on web');
      return;
    }

    // Load GPS profile for this activity type from API or fallback
    const profile = getGpsProfileForSport(sportTypeId);
    currentGpsProfile.current = profile;

    // Check if GPS is enabled for this activity type
    if (!profile.enabled) {
      logger.gps('GPS tracking disabled for sport type', { sportTypeId });
      return;
    }

    logger.gps('Starting GPS tracking', {
      activityId,
      sportTypeId,
      profile: {
        accuracyThreshold: profile.accuracyThreshold,
        minDistanceThreshold: profile.minDistanceThreshold,
        maxRealisticSpeed: profile.maxRealisticSpeed,
        timeInterval: profile.timeInterval,
      },
    });

    currentActivityId.current = activityId;

    try {
      // Clear any leftover background points
      await clearLocationBuffer();

      // Store activity ID for background task
      await setActiveActivityId(activityId);

      // Start background location tracking (works when app is backgrounded)
      await startBackgroundLocationTracking(profile);

      // Also start foreground tracking for immediate UI updates
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: profile.distanceInterval,
          timeInterval: profile.timeInterval,
        },
        (location) => {
          const gpsProfile = currentGpsProfile.current;

          // Filter out inaccurate GPS readings
          const accuracy = location.coords.accuracy;
          if (accuracy && accuracy > gpsProfile.accuracyThreshold) {
            logger.gps('GPS point filtered: poor accuracy', {
              accuracy: accuracy.toFixed(1),
              threshold: gpsProfile.accuracyThreshold,
            });
            return;
          }

          // Stationary detection: if GPS reports very low speed, use stricter distance threshold
          const gpsSpeed = location.coords.speed;
          const isLikelyStationary = gpsSpeed !== null && gpsSpeed !== undefined && gpsSpeed < 0.5; // < 0.5 m/s = < 1.8 km/h
          const effectiveMinDistance = isLikelyStationary
            ? Math.max(gpsProfile.minDistanceThreshold, 8) // At least 8m when stationary
            : gpsProfile.minDistanceThreshold;

          const point: GpsPoint = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            ele: location.coords.altitude ?? undefined,
            time: new Date(location.timestamp).toISOString(),
            speed: location.coords.speed ?? undefined,
          };

          // Apply GPS smoothing to reduce jitter/drift
          const smoothedPoint = getSmoothedPosition({
            lat: point.lat,
            lng: point.lng,
            ele: point.ele,
            timestamp: location.timestamp,
          });

          // Calculate local distance for immediate UI feedback
          if (lastPosition.current) {
            // Use smoothed position for distance calculation
            const dist = calculateDistance(
              lastPosition.current.lat,
              lastPosition.current.lng,
              smoothedPoint.lat,
              smoothedPoint.lng
            );

            // Calculate actual time difference between GPS readings
            const timeSinceLastPoint = lastPosition.current.timestamp
              ? (location.timestamp - lastPosition.current.timestamp) / 1000
              : 3; // fallback to 3 seconds if no timestamp

            // Calculate implied speed to filter GPS glitches
            const impliedSpeed = timeSinceLastPoint > 0 ? dist / timeSinceLastPoint : 999;

            if (dist > effectiveMinDistance && impliedSpeed < gpsProfile.maxRealisticSpeed) {
              // Only count if moved more than threshold AND speed is realistic
              localStatsRef.current.distance += dist;

              // Calculate elevation gain with noise filter
              if (smoothedPoint.ele && lastPosition.current.ele) {
                const elevDiff = smoothedPoint.ele - lastPosition.current.ele;
                // Only count significant elevation changes to filter GPS altitude noise
                if (elevDiff > gpsProfile.minElevationChange) {
                  localStatsRef.current.elevation_gain += elevDiff;
                }
              }

              setState((prev) => ({
                ...prev,
                currentStats: { ...localStatsRef.current },
              }));
            } else if (dist > effectiveMinDistance && impliedSpeed >= gpsProfile.maxRealisticSpeed) {
              logger.gps('GPS point filtered: unrealistic speed', {
                distance: dist.toFixed(1),
                timeDelta: timeSinceLastPoint.toFixed(1),
                speedKmh: (impliedSpeed * 3.6).toFixed(1),
                maxSpeedKmh: (gpsProfile.maxRealisticSpeed * 3.6).toFixed(1),
              });
            } else if (dist <= effectiveMinDistance) {
              logger.debug('gps', 'GPS point filtered: small movement', {
                distance: dist.toFixed(1),
                threshold: effectiveMinDistance,
                isStationary: isLikelyStationary,
              });
            }
          }

          // Update last position with smoothed values for next calculation
          lastPosition.current = { lat: smoothedPoint.lat, lng: smoothedPoint.lng, ele: smoothedPoint.ele, timestamp: location.timestamp };
          // Store original (non-smoothed) point for server sync
          pointsBuffer.current.push(point);
        }
      );

      // Sync points to server every 30 seconds
      syncInterval.current = setInterval(() => syncPoints(activityId), 30000);

      // Sync background points every 15 seconds (background task buffers while app is inactive)
      backgroundSyncInterval.current = setInterval(
        () => syncBackgroundPoints(activityId),
        15000
      );

      // Start duration timer with current stats (important for crash recovery)
      startDurationTimer(localStatsRef.current.duration, localStatsRef.current.calories);

      logger.gps('GPS tracking started successfully', { activityId, mode: 'foreground+background' });
    } catch (error) {
      logger.error('gps', 'Failed to start GPS tracking', { error, activityId });
    }
  };

  const stopGpsTracking = async () => {
    // Stop foreground tracking
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    if (syncInterval.current) {
      clearInterval(syncInterval.current);
      syncInterval.current = null;
    }
    if (backgroundSyncInterval.current) {
      clearInterval(backgroundSyncInterval.current);
      backgroundSyncInterval.current = null;
    }

    // Stop background tracking
    await stopBackgroundLocationTracking();
    await setActiveActivityId(null);
    await clearLocationBuffer();

    // Clear GPS smoothing buffer
    gpsBuffer.current = [];

    currentActivityId.current = null;
    stopDurationTimer();

    logger.gps('GPS tracking stopped');
  };

  const syncPoints = async (activityId: number) => {
    if (pointsBuffer.current.length === 0) return;

    const pointsToSync = [...pointsBuffer.current];
    pointsBuffer.current = [];

    logger.gps('Syncing GPS points to server', { activityId, count: pointsToSync.length });

    try {
      // Send points with current calories for crash recovery
      const result = await api.addActivityPoints(activityId, pointsToSync, {
        calories: localStatsRef.current.calories,
      });

      // Update with server-calculated stats (more accurate)
      const newStats: LiveActivityStats = {
        distance: result.stats.distance,
        duration: result.stats.duration,
        elevation_gain: result.stats.elevation_gain,
        points_count: result.total_points,
        // Keep local values for these as they're calculated locally
        avg_speed: localStatsRef.current.avg_speed,
        max_speed: localStatsRef.current.max_speed,
        avg_heart_rate: localStatsRef.current.avg_heart_rate,
        max_heart_rate: localStatsRef.current.max_heart_rate,
        // Use server calories if available, otherwise keep local
        calories: result.stats.calories ?? localStatsRef.current.calories,
      };
      localStatsRef.current = newStats;
      setState((prev) => ({
        ...prev,
        currentStats: newStats,
      }));

      logger.gps('GPS points synced successfully', {
        synced: result.points_count,
        total: result.total_points,
        distance: result.stats.distance,
        duration: result.stats.duration,
      });
    } catch (error) {
      // Re-add points on failure
      pointsBuffer.current = [...pointsToSync, ...pointsBuffer.current];
      logger.error('gps', 'Failed to sync GPS points', {
        activityId,
        pointsCount: pointsToSync.length,
        error,
      });
    }
  };

  const startTracking = useCallback(
    async (sportTypeId: number, title?: string, eventId?: number) => {
      try {
        logger.activity('Starting activity tracking', { sportTypeId, title, eventId });
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
            calories: existingActivity.calories || 0,
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

        // Get GPS profile for this sport type and send it to API
        const gpsProfile = getGpsProfileForSport(sportTypeId);
        const gpsProfileRequest = convertToApiGpsProfile(gpsProfile);

        // Start activity on server with GPS profile
        const activity = await api.startLiveActivity({
          sport_type_id: sportTypeId,
          title,
          started_at: new Date().toISOString(),
          event_id: eventId,
          gps_profile: gpsProfileRequest,
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

        // Start GPS tracking with sport-specific profile
        await startGpsTracking(activity.id, sportTypeId);

        logger.activity('Activity started successfully', {
          id: activity.id,
          sportTypeId,
          eventId,
        });

        return activity;
      } catch (error: any) {
        logger.error('activity', 'Failed to start activity', { sportTypeId, error: error.message });
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
      logger.activity('Pausing activity', { id: state.activity.id });
      setState((prev) => ({ ...prev, isLoading: true }));

      // Stop GPS
      await stopGpsTracking();

      // Sync remaining points
      await syncPoints(state.activity.id);

      // Pause on server
      const activity = await api.pauseActivity(state.activity.id);

      logger.activity('Activity paused', { id: activity.id, duration: activity.duration });

      setState((prev) => ({
        ...prev,
        activity,
        isTracking: false,
        isPaused: true,
        isLoading: false,
      }));
    } catch (error: any) {
      logger.error('activity', 'Failed to pause activity', { id: state.activity.id, error: error.message });
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
      logger.activity('Resuming activity', { id: state.activity.id, status: state.activity.status });
      setState((prev) => ({ ...prev, isLoading: true }));

      let activity = state.activity;

      // Only call API resume if activity is paused
      // If activity is already in_progress (e.g., app crashed), just restart GPS tracking
      if (state.activity.status === 'paused') {
        activity = await api.resumeActivity(state.activity.id);
        // Update paused duration from server
        pausedDuration.current = activity.total_paused_duration || 0;
        logger.activity('Activity resumed via API', { id: activity.id });
      } else if (state.activity.status === 'in_progress') {
        // Activity is already in progress, just need to restart local GPS tracking
        // No API call needed
        logger.activity('Activity already in progress, restarting GPS tracking', { id: activity.id });
      }

      setState((prev) => ({
        ...prev,
        activity,
        isTracking: true,
        isPaused: false,
        isLoading: false,
        hasExistingActivity: false, // Clear the flag - user chose to resume
      }));

      // Restart GPS tracking with sport-specific profile
      await startGpsTracking(activity.id, activity.sport_type_id);
    } catch (error: any) {
      logger.error('activity', 'Failed to resume activity', { id: state.activity.id, error: error.message });
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
        logger.activity('Finishing activity', { id: state.activity.id });
        setState((prev) => ({ ...prev, isLoading: true }));

        // Stop GPS
        await stopGpsTracking();

        // Sync remaining points
        await syncPoints(state.activity.id);

        // Finish on server
        const activity = await api.finishActivity(state.activity.id, {
          ...data,
          ended_at: new Date().toISOString(),
        });

        logger.activity('Activity finished successfully', {
          id: activity.id,
          distance: activity.distance,
          duration: activity.duration,
          hasGpsTrack: activity.has_gps_track,
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
        logger.error('activity', 'Failed to finish activity', { id: state.activity.id, error: error.message });
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
      logger.activity('Discarding activity', { id: state.activity.id });
      setState((prev) => ({ ...prev, isLoading: true }));

      // Stop GPS
      await stopGpsTracking();

      // Discard on server
      await api.discardActivity(state.activity.id);

      logger.activity('Activity discarded', { id: state.activity.id });

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
      logger.error('activity', 'Failed to discard activity', { id: state.activity.id, error: error.message });
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
