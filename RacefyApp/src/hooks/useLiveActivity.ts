import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Platform } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../services/api';
import {
  getLastBackgroundPosition,
  migrateLegacyBuffers,
  setActiveActivityId,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  syncAudioCoachForegroundDistance,
} from '../services/backgroundLocation';
import { drainPoints, toGpsPoints } from '../services/pointsUploader';
import { enqueueUnsyncedActivity } from '../services/unsyncedActivities';
import * as trackingDb from '../services/trackingDb';
import * as Crypto from 'expo-crypto';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import type { Activity, ActivityLocation, AutoCreatedPost, GpsPoint } from '../types/api';
import {
  convertToApiGpsProfile,
  DEFAULT_GPS_PROFILE,
  type GpsProfile,
} from '../config/gpsProfiles';
import { useSportTypes } from './useSportTypes';
import { useAuth } from './useAuth';
import { logger } from '../services/logger';
import { captureActivityLocation } from '../utils/locationCapture';
import { PaceTracker } from '../utils/paceCalculator';
import { accumulateRecoveredTrack, haversineDistance } from '../utils/gpsMath';
import { computeDurationTick } from '../utils/durationStats';
import { GpsTracker } from '../services/gpsTracking';
import {
  CALORIES_PER_SECOND,
  GPS_GAP_THRESHOLD_MS,
  GPS_GOOD_THRESHOLD_MS,
  GPS_WEAK_THRESHOLD_MS,
  MAX_PACE_SEGMENTS,
  SYNC_INTERVAL_MS,
} from '../constants/tracking';

const isWeb = Platform.OS === 'web';

export interface LiveActivityStats {
  distance: number;
  duration: number;
  elevation_gain: number;
  points_count: number;
  avg_speed: number;
  max_speed: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  calories: number;
  /** Current pace in seconds per kilometer (smoothed), or null if insufficient data */
  currentPace: number | null;
}

// GPS and network status for UI feedback
export interface TrackingStatus {
  gpsSignal: 'good' | 'weak' | 'lost' | 'disabled'; // GPS signal quality or disabled for indoor sports
  isOnline: boolean; // Network connectivity
  pendingPoints: number; // Points waiting to sync
  lastSyncTime: Date | null; // Last successful sync
  syncError: string | null; // Last sync error if any
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
  // GPS and network status for UI feedback
  trackingStatus: TrackingStatus;
}

const initialStats: LiveActivityStats = {
  distance: 0,
  duration: 0,
  elevation_gain: 0,
  points_count: 0,
  avg_speed: 0,
  max_speed: 0,
  calories: 0,
  currentPace: null,
};

// Internal hook implementation (not exported directly)
function useLiveActivityInternal() {
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
    trackingStatus: {
      gpsSignal: 'good',
      isOnline: true,
      pendingPoints: 0,
      lastSyncTime: null,
      syncError: null,
    },
  });

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  // Accumulates ALL route points for map visualization (never cleared on sync)
  const allRoutePoints = useRef<GpsPoint[]>([]);
  const syncInterval = useRef<NodeJS.Timeout | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const backgroundSyncInterval = useRef<NodeJS.Timeout | null>(null);
  const localStatsRef = useRef<LiveActivityStats>({ ...initialStats });
  const trackingStartTime = useRef<number | null>(null);
  const pausedDuration = useRef<number>(0);
  const currentActivityId = useRef<number | null>(null);

  // Device-minted UUID of the SQLite tracking session (durable point log).
  const clientActivityIdRef = useRef<string | null>(null);

  // Highest SQLite seq already reflected in allRoutePoints/local stats —
  // lets the foreground catch up on background-collected points read-only.
  const lastRenderedSeqRef = useRef<number>(-1);

  // Guard to prevent concurrent finish/discard calls
  const isFinishingOrDiscardingRef = useRef<boolean>(false);

  // Version counter for allRoutePoints — incremented on every push/reset
  // so consumers (MapboxLiveMap) can cheaply detect changes without array copy
  const pointsVersionRef = useRef<number>(0);

  // Location captured at activity start (for sending with finish request)
  const activityLocationRef = useRef<ActivityLocation | null>(null);

  // GPS positioning tracker — owns the smoothing buffer + last-position baseline +
  // gap clock (stateful class extracted to services/gpsTracking).
  const gpsTracker = useRef(new GpsTracker()).current;

  // Current GPS profile based on activity type
  const currentGpsProfile = useRef<GpsProfile>(DEFAULT_GPS_PROFILE);

  // App state tracking for GPS drift prevention
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const skipNextGpsPoint = useRef<boolean>(false);
  const appStateSubscription = useRef<any>(null);

  // Network status tracking
  const networkSubscription = useRef<any>(null);
  const isOnlineRef = useRef<boolean>(true);

  // GPS signal tracking (time since last valid GPS point)
  const lastGpsTime = useRef<number>(Date.now());
  const gpsSignalCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Pace calculation — stateful segment buffer + smoothing extracted to utils/paceCalculator.
  const paceTracker = useRef(new PaceTracker()).current;

  // Calculate smoothed position from GPS buffer (with recency weighting)
  const getSmoothedPosition = (newPoint: {
    lat: number;
    lng: number;
    ele?: number;
    timestamp: number;
  }) => gpsTracker.smooth(newPoint, currentGpsProfile.current.smoothingBufferSize);

  // Check for existing active activity on mount (only for authenticated users)
  useEffect(() => {
    if (isAuthenticated) {
      checkExistingActivity();
    }
  }, [isAuthenticated]);

  // Set up network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = isOnlineRef.current;
      isOnlineRef.current = state.isConnected ?? true;

      setState((prev) => ({
        ...prev,
        trackingStatus: {
          ...prev.trackingStatus,
          isOnline: isOnlineRef.current,
        },
      }));

      // If we came back online and have pending points, trigger sync
      if (!wasOnline && isOnlineRef.current && currentActivityId.current) {
        logger.gps('Network restored, triggering sync');
        syncPoints(currentActivityId.current);
      }
    });

    networkSubscription.current = unsubscribe;

    return () => {
      if (networkSubscription.current) {
        networkSubscription.current();
      }
    };
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
      if (backgroundSyncInterval.current) {
        clearInterval(backgroundSyncInterval.current);
      }
      if (appStateSubscription.current) {
        appStateSubscription.current.remove();
      }
      if (gpsSignalCheckInterval.current) {
        clearInterval(gpsSignalCheckInterval.current);
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
          currentPace: null, // Will be calculated when tracking resumes
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
        setState((prev) => ({
          ...prev,
          isLoading: false,
          hasExistingActivity: false,
        }));
      }
    } catch (error) {
      logger.error('activity', 'Failed to check existing activity', { error });
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Start local duration timer for real-time UI updates
  const startDurationTimer = (initialDuration: number = 0, initialCalories: number = 0) => {
    trackingStartTime.current = Date.now() - initialDuration * 1000;
    const baseCalories = initialCalories;

    durationInterval.current = setInterval(() => {
      if (trackingStartTime.current) {
        const { duration, calories } = computeDurationTick({
          trackingStartTime: trackingStartTime.current,
          now: Date.now(),
          baseCalories,
          previousDuration: localStatsRef.current.duration || 0,
          previousCalories: localStatsRef.current.calories,
          caloriesPerSecond: CALORIES_PER_SECOND,
        });

        localStatsRef.current.duration = duration;
        localStatsRef.current.calories = calories;

        setState((prev) => ({
          ...prev,
          currentStats: {
            ...prev.currentStats,
            duration,
            calories,
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

  // Merge points collected by the background task into the UI (map + stats).
  // READ-ONLY over the SQLite log keyed by seq — nothing is cleared here, so a
  // crash between merge and upload can no longer lose points (the uploader
  // drains the same rows independently).
  const mergeBackgroundPoints = (activityId: number) => {
    const clientId = clientActivityIdRef.current;
    if (!clientId) return;

    try {
      const stored = trackingDb.getPointsAfterSeq(clientId, lastRenderedSeqRef.current);
      if (stored.length === 0) {
        logger.gps('Foreground: No new background points to merge', { activityId });
        return;
      }

      lastRenderedSeqRef.current = stored[stored.length - 1].seq;

      // Walk the background points, bridging gaps: a hop > GPS_GAP_THRESHOLD_MS
      // with a realistic implied speed counts its straight-line distance and is
      // marked segment_break (map draws separate segments); an unrealistic hop
      // (glitch) is discarded like before.
      const profile = currentGpsProfile.current;
      const points: GpsPoint[] = [];
      let additionalDistance = 0;
      let additionalElevation = 0;
      let prevBufTime = gpsTracker.lastBufferedTime;
      let prevPos: { lat: number; lng: number; ele?: number } | null = gpsTracker.lastPosition;

      for (const p of stored) {
        const pointTime = new Date(p.ts).getTime();
        const dist = prevPos ? haversineDistance(prevPos.lat, prevPos.lng, p.lat, p.lng) : 0;
        const isGap = prevBufTime !== null && pointTime - prevBufTime > GPS_GAP_THRESHOLD_MS;
        let segmentBreak = false;

        if (isGap && prevBufTime !== null) {
          const impliedSpeed = dist / Math.max((pointTime - prevBufTime) / 1000, 1);
          if (dist > profile.minDistanceThreshold && impliedSpeed < profile.maxRealisticSpeed) {
            segmentBreak = true;
            logger.gps('Background gap bridged: distance counted, segment break marked', {
              gapSeconds: ((pointTime - prevBufTime) / 1000).toFixed(0),
              bridgedMeters: dist.toFixed(1),
            });
          } else {
            logger.gps('Background point discarded: unrealistic hop across time gap', {
              gapSeconds: ((pointTime - prevBufTime) / 1000).toFixed(0),
              meters: dist.toFixed(1),
            });
            // Advance clock/position: next point starts the new segment
            prevBufTime = pointTime;
            prevPos = { lat: p.lat, lng: p.lng, ele: p.ele };
            continue;
          }
        }

        if (prevPos && dist > profile.minDistanceThreshold) {
          additionalDistance += dist;
          if (p.ele != null && prevPos.ele != null) {
            const elevDiff = p.ele - prevPos.ele;
            if (elevDiff > profile.minElevationChange) {
              additionalElevation += elevDiff;
            }
          }
        }

        points.push({
          lat: p.lat,
          lng: p.lng,
          ele: p.ele,
          time: p.ts,
          speed: p.speed,
          accuracy: p.accuracy,
          segment_break: segmentBreak || undefined,
        });
        prevBufTime = pointTime;
        prevPos = { lat: p.lat, lng: p.lng, ele: p.ele };
      }

      if (points.length > 0) {
        allRoutePoints.current.push(...points);
        pointsVersionRef.current++;
        // Update the gap-detection clock to the last accepted background point
        const lastPoint = points[points.length - 1];
        if (lastPoint.time) {
          gpsTracker.lastBufferedTime = new Date(lastPoint.time).getTime();
        }
      }

      // Update local stats immediately so distance/elevation reflect the
      // background segment as soon as the app returns to foreground.
      if (additionalDistance > 0) {
        localStatsRef.current.distance += additionalDistance;
        localStatsRef.current.elevation_gain += additionalElevation;

        logger.gps('Updated local stats from background points', {
          additionalDistance: additionalDistance.toFixed(1),
          additionalElevation: additionalElevation.toFixed(1),
          totalDistance: localStatsRef.current.distance.toFixed(1),
        });

        setState((prev) => ({
          ...prev,
          currentStats: { ...localStatsRef.current },
        }));
      }
    } catch (error) {
      logger.error('gps', 'Failed to merge background points', { activityId, error });
    }
  };

  // Start foreground GPS tracking (real-time UI updates)
  const startForegroundTracking = async () => {
    const profile = currentGpsProfile.current;

    if (locationSubscription.current) {
      logger.gps('Foreground tracking already running');
      return;
    }

    logger.gps('Starting foreground GPS tracking');

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: profile.distanceInterval,
        timeInterval: profile.timeInterval,
      },
      (location) => {
        const gpsProfile = currentGpsProfile.current;

        // Filter out inaccurate GPS readings first
        const accuracy = location.coords.accuracy;
        if (accuracy && accuracy > gpsProfile.accuracyThreshold) {
          logger.gps('GPS point filtered: poor accuracy', {
            accuracy: accuracy.toFixed(1),
            threshold: gpsProfile.accuracyThreshold,
          });
          return;
        }

        // Skip first GPS point after returning from background to avoid drift
        // BUT update lastPosition so the next point has a valid baseline
        if (skipNextGpsPoint.current) {
          logger.gps(
            'Skipping first GPS point after returning from background (using as new baseline)',
            {
              accuracy: location.coords.accuracy,
              speed: location.coords.speed,
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            },
          );
          skipNextGpsPoint.current = false;

          // Use smoothed position for baseline consistency
          // (next point calculation also uses smoothed position)
          const smoothedBaseline = getSmoothedPosition({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            ele: location.coords.altitude ?? undefined,
            timestamp: location.timestamp,
          });

          // Update lastPosition with smoothed values for consistent distance calculation
          gpsTracker.lastPosition = {
            lat: smoothedBaseline.lat,
            lng: smoothedBaseline.lng,
            ele: smoothedBaseline.ele,
            timestamp: location.timestamp,
          };

          // Don't add to buffer or calculate distance, just set baseline
          return;
        }

        const point: GpsPoint = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          ele: location.coords.altitude ?? undefined,
          time: new Date(location.timestamp).toISOString(),
          speed:
            location.coords.speed != null && location.coords.speed >= 0
              ? location.coords.speed
              : undefined,
          accuracy: location.coords.accuracy ?? undefined,
        };

        // Feed the raw reading through the positioning tracker: it smooths, classifies
        // it against the baseline (filter/gap/accept), and advances the baseline + gap
        // clock. We just apply the returned stats deltas + side effects. `decision` is
        // null on the very first point (no baseline to measure against yet).
        const { decision } = gpsTracker.addPoint({
          raw: {
            lat: point.lat,
            lng: point.lng,
            ele: point.ele,
            timestamp: location.timestamp,
          },
          profile: gpsProfile,
          gapThresholdMs: GPS_GAP_THRESHOLD_MS,
          rawSpeed: location.coords.speed,
        });

        if (decision) {
          if (decision.outcome === 'accepted' || decision.outcome === 'gap-bridged') {
            // Validated points count; a bridged gap counts its straight-line
            // distance (like a GPS watch through a tunnel) with a segment break.
            localStatsRef.current.distance += decision.distanceAdded;
            localStatsRef.current.elevation_gain += decision.elevationAdded;

            if (decision.segmentBreak) {
              point.segment_break = true;
              // A minutes-long hop would poison the smoothed current pace —
              // restart pace tracking from this point.
              paceTracker.reset();
              logger.gps('GPS gap bridged: distance counted, segment break marked', {
                gapSeconds: (decision.gapMs / 1000).toFixed(0),
                bridgedMeters: decision.distanceAdded.toFixed(1),
                impliedKmh: (decision.impliedSpeed * 3.6).toFixed(1),
              });
            } else {
              // Track pace segment and refresh the smoothed current pace.
              localStatsRef.current.currentPace = paceTracker.record(
                {
                  timestamp: location.timestamp,
                  distance: localStatsRef.current.distance,
                },
                gpsProfile,
                MAX_PACE_SEGMENTS,
              );
            }

            // Map trail keeps the original (non-smoothed) validated point
            allRoutePoints.current.push(point);
            pointsVersionRef.current++;

            // Durable log: the accepted point goes to SQLite with the cumulative
            // distance — this is the upload queue AND the crash-recovery source.
            // IMPORTANT: Only validated points are stored/synced to prevent
            // GPS jumps/glitches from reaching the server.
            if (clientActivityIdRef.current && point.time) {
              const range = trackingDb.insertPoints(
                clientActivityIdRef.current,
                [
                  {
                    lat: point.lat,
                    lng: point.lng,
                    ele: point.ele,
                    ts: point.time,
                    speed: point.speed,
                    accuracy: point.accuracy,
                    cumDist: localStatsRef.current.distance,
                    segmentBreak: point.segment_break === true,
                  },
                ],
                'fg',
              );
              if (range) {
                lastRenderedSeqRef.current = range.lastSeq;
              }
            }

            setState((prev) => ({
              ...prev,
              currentStats: { ...localStatsRef.current },
            }));
          } else if (decision.outcome === 'gap') {
            // Route discontinuity (app was backgrounded, GPS signal lost). The first
            // "jump" point is discarded and the gap clock advanced inside addPoint.
            logger.gps('GPS point discarded: route segment break (large time gap)', {
              gapSeconds: (decision.gapMs / 1000).toFixed(0),
              thresholdSeconds: GPS_GAP_THRESHOLD_MS / 1000,
              lat: point.lat,
              lng: point.lng,
            });
          } else if (decision.outcome === 'filtered-speed') {
            logger.gps('GPS point filtered: unrealistic speed - NOT synced to server', {
              distance: decision.distance.toFixed(1),
              timeDelta: decision.timeSinceLastPoint.toFixed(1),
              speedKmh: (decision.impliedSpeed * 3.6).toFixed(1),
              maxSpeedKmh: (gpsProfile.maxRealisticSpeed * 3.6).toFixed(1),
            });
          } else {
            logger.debug('gps', 'GPS point filtered: small movement - NOT synced to server', {
              distance: decision.distance.toFixed(1),
              threshold: decision.effectiveMinDistance,
              isStationary: decision.isStationary,
            });
          }
        }

        // Update GPS signal time (we got a GPS reading, even if filtered)
        lastGpsTime.current = Date.now();
      },
    );

    logger.gps('Foreground GPS tracking started');
  };

  // Stop foreground GPS tracking
  const stopForegroundTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
      logger.gps('Foreground GPS tracking stopped');
    }
  };

  // Handle app state changes - toggle between foreground/background tracking
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    const previousAppState = appState.current;
    const activityId = currentActivityId.current;

    if (!activityId) {
      appState.current = nextAppState;
      return;
    }

    if (previousAppState === 'active' && nextAppState.match(/inactive|background/)) {
      // App going to background
      logger.gps('App going to background - switching to background tracking');

      // Check if background tracking is running
      // On Android: Should always be running (started preemptively, never stopped)
      // On iOS: May have been stopped, need to restart
      const isBackgroundRunning = await Location.hasStartedLocationUpdatesAsync(
        'background-location-task',
      ).catch(() => false);

      if (!isBackgroundRunning) {
        logger.gps('Background tracking not running, starting now...');
        const bgStarted = await startBackgroundLocationTracking(currentGpsProfile.current);
        if (!bgStarted) {
          logger.warn('gps', 'Failed to start background tracking - GPS will pause in background');
        }
      } else {
        logger.gps('Background tracking already running (continuing)');
      }

      // Sync foreground distance to background audio coach so it continues
      // from the correct total distance (not just previous background sessions)
      await syncAudioCoachForegroundDistance(localStatsRef.current.distance);

      // Stop foreground tracking (background tracking should now be running)
      stopForegroundTracking();

      // Verify background tracking is running (final check)
      const isBgRunningFinal = await Location.hasStartedLocationUpdatesAsync(
        'background-location-task',
      ).catch(() => false);

      if (!isBgRunningFinal) {
        logger.warn('gps', 'Background tracking not running - GPS will pause in background');
        setState((prev) => ({
          ...prev,
          trackingStatus: {
            ...prev.trackingStatus,
            gpsSignal: 'lost',
            syncError: 'Background tracking not available',
          },
        }));
      } else {
        logger.gps('Background tracking confirmed running');
      }
    } else if (previousAppState.match(/inactive|background/) && nextAppState === 'active') {
      // App returning to foreground
      logger.gps('App returning to foreground - switching to foreground tracking');

      // IMPORTANT: On Android, DON'T stop background tracking - keep it running throughout the activity
      // Stopping it would prevent restart when going back to background (foreground service restriction)
      // On iOS, we can stop it since iOS allows starting background tasks when going to background
      const shouldStopBackground = Platform.OS === 'ios';

      if (shouldStopBackground) {
        // 1. Stop background tracking and wait for completion (iOS only)
        await stopBackgroundLocationTracking();
        // 2. Small delay to ensure background listener is fully stopped (race condition fix)
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        logger.gps('Keeping background tracking running (Android)');
      }

      // 3. Merge background points into map/stats (read-only over the SQLite log)
      mergeBackgroundPoints(activityId);

      // 3b. Kick an upload immediately (don't wait for the 30s tick) — the
      // uploader no-ops if the background task already drained everything.
      await syncPoints(activityId);

      // 4. Recover last position from background for distance continuity
      const lastBgPosition = await getLastBackgroundPosition();
      if (lastBgPosition) {
        gpsTracker.lastPosition = {
          lat: lastBgPosition.lat,
          lng: lastBgPosition.lng,
          timestamp: lastBgPosition.timestamp,
        };
        logger.gps('Recovered last background position for distance continuity', {
          lat: lastBgPosition.lat,
          lng: lastBgPosition.lng,
        });
      }

      // 5. Clear GPS smoothing buffer and skip first point to avoid drift
      gpsTracker.clearBuffer();
      skipNextGpsPoint.current = true;

      // 6. NOW start foreground tracking
      await startForegroundTracking();

      // 7. Reset GPS signal status (will update when first GPS point arrives)
      setState((prev) => ({
        ...prev,
        trackingStatus: {
          ...prev.trackingStatus,
          gpsSignal: 'weak', // Set to weak until we get a fresh GPS reading
          syncError: null, // Clear any background tracking errors
        },
      }));

      logger.gps('Switched to foreground tracking mode');
    }

    appState.current = nextAppState;
  };

  const startGpsTracking = async (activityId: number, sportTypeId: number) => {
    if (isWeb) {
      logger.gps('GPS tracking not available on web');
      return;
    }

    // Load GPS profile for this activity type from API or fallback
    const profile = getGpsProfileForSport(sportTypeId);
    currentGpsProfile.current = profile;

    logger.info('gps', 'GPS profile loaded for activity', {
      activityId,
      sportTypeId,
      enabled: profile.enabled,
      accuracyThreshold: profile.accuracyThreshold,
      minDistanceThreshold: profile.minDistanceThreshold,
      maxRealisticSpeed: profile.maxRealisticSpeed,
      timeInterval: profile.timeInterval,
      distanceInterval: profile.distanceInterval,
    });

    // Check if GPS is enabled for this activity type
    if (!profile.enabled) {
      logger.warn('gps', 'GPS tracking disabled for sport type', {
        sportTypeId,
        activityId,
        profileEnabled: profile.enabled,
      });

      // Update tracking status to show GPS is intentionally disabled (UI feedback)
      setState((prev) => ({
        ...prev,
        trackingStatus: {
          ...prev.trackingStatus,
          gpsSignal: 'disabled',
        },
      }));
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

    // Ensure a durable SQLite tracking session exists for this activity
    // (covers fresh start, resume and crash recovery — all paths land here).
    lastRenderedSeqRef.current = -1;
    try {
      const existingSession = trackingDb.getSessionByServerActivityId(activityId);
      if (existingSession) {
        clientActivityIdRef.current = existingSession.clientActivityId;
      } else {
        const uuid = Crypto.randomUUID();
        trackingDb.startSession(uuid);
        trackingDb.bindServerActivity(uuid, activityId);
        clientActivityIdRef.current = uuid;
      }
    } catch (dbErr) {
      logger.error('gps', 'Failed to ensure tracking DB session', { error: dbErr });
      clientActivityIdRef.current = null;
    }

    try {
      // One-time: fold leftover pre-update AsyncStorage buffers into the SQLite
      // log (as unsynced) and delete the legacy keys — must run before recovery.
      await migrateLegacyBuffers(clientActivityIdRef.current);

      // Crash recovery: restore the full route + local stats from the SQLite
      // point log (survives app kill; superset of the old AsyncStorage buffers).
      const storedPoints = clientActivityIdRef.current
        ? trackingDb.getAllPoints(clientActivityIdRef.current)
        : [];
      if (storedPoints.length > 0) {
        logger.gps('Recovered persisted points from tracking DB', {
          count: storedPoints.length,
        });
        const recoveredGpsPoints: GpsPoint[] = storedPoints.map((p) => ({
          lat: p.lat,
          lng: p.lng,
          ele: p.ele,
          time: p.ts,
          speed: p.speed,
          accuracy: p.accuracy,
        }));
        allRoutePoints.current.push(...recoveredGpsPoints);
        pointsVersionRef.current++;
        lastRenderedSeqRef.current = storedPoints[storedPoints.length - 1].seq;

        // Rebuild local distance/elevation. Prefer the durable cumulative
        // distance snapshot written with each foreground point; fall back to
        // re-accumulating with the same gap/threshold filters as live tracking
        // (gpsMath.accumulateRecoveredTrack). Use max() against the current
        // (server-seeded) value — never regress the displayed distance.
        const lastCumDist = [...storedPoints].reverse().find((p) => p.cumDist != null)?.cumDist;
        const recovered = accumulateRecoveredTrack(
          recoveredGpsPoints,
          profile.minDistanceThreshold,
          profile.minElevationChange,
          GPS_GAP_THRESHOLD_MS,
          profile.maxRealisticSpeed,
        );
        const recoveredDistance = Math.max(lastCumDist ?? 0, recovered.distance);

        if (recoveredDistance > 0) {
          localStatsRef.current = {
            ...localStatsRef.current,
            distance: Math.max(localStatsRef.current.distance, recoveredDistance),
            elevation_gain: Math.max(
              localStatsRef.current.elevation_gain || 0,
              recovered.elevationGain,
            ),
          };

          // Seed the gap clock + last position so the very next live GPS sample
          // doesn't add a jump from the recovered tail to the new position.
          if (recovered.lastPoint) {
            gpsTracker.lastPosition = {
              lat: recovered.lastPoint.lat,
              lng: recovered.lastPoint.lng,
              ele: recovered.lastPoint.ele,
              timestamp: recovered.lastPoint.timestamp || Date.now(),
            };
          }
          if (recovered.lastTimestamp) {
            gpsTracker.lastBufferedTime = recovered.lastTimestamp;
          }

          setState((prevState) => ({
            ...prevState,
            currentStats: { ...localStatsRef.current },
          }));

          logger.gps('Restored local stats from recovered points', {
            recoveredDistance: recoveredDistance.toFixed(1),
            fromCumDist: lastCumDist != null,
            totalDistance: localStatsRef.current.distance.toFixed(1),
            recoveredCount: recovered.count,
          });
        }
      }

      // Store activity ID for background task
      await setActiveActivityId(activityId);

      // Set up app state change listener to toggle between foreground/background tracking
      appStateSubscription.current = AppState.addEventListener('change', handleAppStateChange);

      // IMPORTANT: On Android, start background tracking FIRST while app is in foreground
      // This prevents the "foreground service cannot be started in background" error
      // Background tracking runs alongside foreground tracking, ready for when app goes to background
      if (Platform.OS === 'android') {
        const bgStarted = await startBackgroundLocationTracking(profile);
        if (!bgStarted) {
          logger.warn(
            'gps',
            'Failed to start background tracking preemptively - GPS may not work in background',
          );
        } else {
          logger.gps('Background tracking started preemptively (Android)');
        }
      }

      // Start foreground tracking for real-time updates
      await startForegroundTracking();

      // Upload pending points every 30 seconds. Backoff after failures is
      // owned by the uploader itself (persisted in the tracking DB), so the
      // tick can fire unconditionally. The 10s AsyncStorage persist interval is
      // gone — every accepted point is already durable in SQLite at write time.
      syncInterval.current = setInterval(() => {
        syncPoints(activityId);
      }, SYNC_INTERVAL_MS);

      // Check GPS signal quality every 5 seconds
      lastGpsTime.current = Date.now();
      gpsSignalCheckInterval.current = setInterval(() => {
        const timeSinceLastGps = Date.now() - lastGpsTime.current;
        let gpsSignal: 'good' | 'weak' | 'lost';

        if (timeSinceLastGps < GPS_GOOD_THRESHOLD_MS) {
          gpsSignal = 'good';
        } else if (timeSinceLastGps < GPS_WEAK_THRESHOLD_MS) {
          gpsSignal = 'weak';
        } else {
          gpsSignal = 'lost';
        }

        setState((prev) => {
          if (prev.trackingStatus.gpsSignal !== gpsSignal) {
            logger.gps('GPS signal changed', { gpsSignal, timeSinceLastGps });
            return {
              ...prev,
              trackingStatus: {
                ...prev.trackingStatus,
                gpsSignal,
              },
            };
          }
          return prev;
        });
      }, 5000);

      // Start duration timer with current stats (important for crash recovery)
      startDurationTimer(localStatsRef.current.duration, localStatsRef.current.calories);

      logger.gps('GPS tracking started successfully', {
        activityId,
        mode: 'foreground (will switch to background when app inactive)',
      });
    } catch (error) {
      // Memory leak fix: Clean up any listeners/intervals that may have been set up before the error
      if (appStateSubscription.current) {
        appStateSubscription.current.remove();
        appStateSubscription.current = null;
      }
      if (syncInterval.current) {
        clearInterval(syncInterval.current);
        syncInterval.current = null;
      }
      if (gpsSignalCheckInterval.current) {
        clearInterval(gpsSignalCheckInterval.current);
        gpsSignalCheckInterval.current = null;
      }
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      currentActivityId.current = null;

      logger.error('gps', 'Failed to start GPS tracking', {
        error,
        activityId,
      });
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
    if (gpsSignalCheckInterval.current) {
      clearInterval(gpsSignalCheckInterval.current);
      gpsSignalCheckInterval.current = null;
    }

    // Stop app state change listener
    if (appStateSubscription.current) {
      appStateSubscription.current.remove();
      appStateSubscription.current = null;
    }

    // Stop background tracking
    await stopBackgroundLocationTracking();
    await setActiveActivityId(null);

    // NOTE: points stay in the SQLite log — the caller decides when to close
    // the session (after successful finish/discard). Prevents data loss if the
    // finish API fails.

    // Clear GPS smoothing buffer
    gpsTracker.clearBuffer();

    // Reset app state tracking
    skipNextGpsPoint.current = false;
    gpsTracker.lastBufferedTime = null;

    currentActivityId.current = null;
    stopDurationTimer();

    logger.gps('GPS tracking stopped');
  };

  // Upload pending points from the SQLite log. The uploader (shared with the
  // background task) owns batching, idempotency and backoff — this wrapper
  // only maintains the UI tracking status and server-derived stat fields.
  const syncPoints = async (_activityId: number) => {
    if (!clientActivityIdRef.current) return;

    const result = await drainPoints({
      stats: {
        calories: localStatsRef.current.calories,
        clientDistance: Math.round(localStatsRef.current.distance),
      },
    });

    // Strava-style: keep local stats during recording, server only stores points
    // for backup. Only metadata (points count) and server-only values (avg/max
    // speed) are taken from the sync response.
    if (result.lastServerStats) {
      localStatsRef.current = {
        ...localStatsRef.current,
        points_count: result.lastServerStats.total_points,
        avg_speed: result.lastServerStats.avg_speed ?? localStatsRef.current.avg_speed,
        max_speed: result.lastServerStats.max_speed ?? localStatsRef.current.max_speed,
      };
    }

    setState((prev) => ({
      ...prev,
      currentStats: { ...localStatsRef.current },
      trackingStatus: {
        ...prev.trackingStatus,
        pendingPoints: result.remaining,
        lastSyncTime: result.uploaded > 0 ? new Date() : prev.trackingStatus.lastSyncTime,
        syncError: result.error ?? (result.backedOff ? prev.trackingStatus.syncError : null),
      },
    }));

    if (result.uploaded > 0) {
      logger.gps('GPS points synced successfully', {
        uploaded: result.uploaded,
        remaining: result.remaining,
        localDistance: Math.round(localStatsRef.current.distance),
      });
    } else if (result.error) {
      logger.warn('gps', 'Sync failed, uploader backing off', { error: result.error });
    }
  };

  const startTracking = useCallback(
    async (sportTypeId: number, title?: string, eventId?: number) => {
      try {
        logger.activity('Starting activity tracking', {
          sportTypeId,
          title,
          eventId,
        });
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
            currentPace: null, // Will be calculated when tracking resumes
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

        // Capture location at activity start (non-blocking - runs in parallel)
        // This location will be sent when finishing the activity
        captureActivityLocation()
          .then((location) => {
            activityLocationRef.current = location;
            logger.activity('Location captured at activity start', {
              hasLocation: !!location,
              city: location?.city,
              country: location?.country,
            });
          })
          .catch((err) => {
            logger.debug('activity', 'Location capture failed (non-blocking)', {
              error: err,
            });
            activityLocationRef.current = null;
          });

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

        // Reset local stats and pace tracking
        localStatsRef.current = { ...initialStats };
        gpsTracker.lastPosition = null;
        allRoutePoints.current = [];
        pointsVersionRef.current++;
        pausedDuration.current = 0;
        trackingStartTime.current = null;
        paceTracker.reset();

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
        logger.error('activity', 'Failed to start activity', {
          sportTypeId,
          error: error.message,
        });
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to start activity',
        }));
        throw error;
      }
    },
    [getGpsProfileForSport],
  );

  const pauseTracking = useCallback(async () => {
    if (!state.activity) return;

    try {
      logger.activity('Pausing activity', { id: state.activity.id });
      setState((prev) => ({ ...prev, isLoading: true }));

      // Stop GPS (no longer clears persisted data — we control that here)
      await stopGpsTracking();

      // Sync remaining points (all accepted points are already durable in SQLite)
      await syncPoints(state.activity.id);

      // Pause on server
      const activity = await api.pauseActivity(state.activity.id);

      logger.activity('Activity paused', {
        id: activity.id,
        duration: activity.duration,
      });

      setState((prev) => ({
        ...prev,
        activity,
        isTracking: false,
        isPaused: true,
        isLoading: false,
      }));
    } catch (error: any) {
      logger.error('activity', 'Failed to pause activity', {
        id: state.activity.id,
        error: error.message,
      });
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
      logger.activity('Resuming activity', {
        id: state.activity.id,
        status: state.activity.status,
      });
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
        logger.activity('Activity already in progress, restarting GPS tracking', {
          id: activity.id,
        });
      }

      setState((prev) => ({
        ...prev,
        activity,
        isTracking: true,
        isPaused: false,
        isLoading: false,
        hasExistingActivity: false, // Clear the flag - user chose to resume
      }));

      // Clear GPS smoothing buffer and skip first point after resume
      // to avoid false distance from pre-pause position
      gpsTracker.clearBuffer();
      skipNextGpsPoint.current = true;

      // Restart GPS tracking with sport-specific profile
      // Fallback to pre-resume state in case API response omits sport_type_id
      const resumeSportTypeId = activity.sport_type_id ?? state.activity.sport_type_id;
      await startGpsTracking(activity.id, resumeSportTypeId);
    } catch (error: any) {
      logger.error('activity', 'Failed to resume activity', {
        id: state.activity.id,
        error: error.message,
      });
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to resume activity',
      }));
      throw error;
    }
  }, [state.activity]);

  // Snapshot the current activity + pending points into the unsynced queue.
  // Called from finish error paths when the server keeps rejecting /points or
  // /finish — the user can later retry or export GPX from the queue screen.
  const enqueueFailedFinish = async (errorMessage: string): Promise<void> => {
    if (!state.activity) return;
    try {
      const points = clientActivityIdRef.current
        ? toGpsPoints(trackingDb.getUnsyncedPoints(clientActivityIdRef.current, 100000))
        : [];
      const startedAt = state.activity.started_at;
      const lastTimestamp = gpsTracker.lastPosition?.timestamp;
      const endedAt = lastTimestamp
        ? new Date(lastTimestamp).toISOString()
        : new Date().toISOString();

      await enqueueUnsyncedActivity(
        {
          activityId: state.activity.id,
          sportTypeId: state.activity.sport_type_id,
          sportTypeName: state.activity.sport_type?.name,
          title: state.activity.title,
          startedAt,
          endedAt,
          distance: Math.round(localStatsRef.current.distance),
          duration: localStatsRef.current.duration,
          elevationGain: Math.round(localStatsRef.current.elevation_gain || 0),
          calories: localStatsRef.current.calories,
          avgHeartRate: localStatsRef.current.avg_heart_rate,
          maxHeartRate: localStatsRef.current.max_heart_rate,
          pointsCount: points.length,
          location: activityLocationRef.current ?? undefined,
          lastError: errorMessage,
        },
        points,
      );
    } catch (err) {
      logger.warn('activity', 'Failed to enqueue unsynced activity', {
        id: state.activity?.id,
        error: err,
      });
    }
  };

  // Helper: Finish activity using GPS timestamp duration (when timer ran after GPS stopped)
  const finishWithGpsDuration = async (data?: {
    title?: string;
    description?: string;
    calories?: number;
    skip_auto_post?: boolean;
  }): Promise<{ activity: Activity; post?: AutoCreatedPost; points_earned?: number } | null> => {
    if (!state.activity) return null;

    isFinishingOrDiscardingRef.current = true;

    try {
      logger.activity('Finishing with GPS duration', { id: state.activity.id });
      setState((prev) => ({ ...prev, isLoading: true }));

      // Capture client distance BEFORE sync (sync overwrites local distance with server value)
      const clientDistance = Math.round(localStatsRef.current.distance);

      // Pre-flush: upload pending points before stopping GPS (reduces final_points payload)
      if (state.activity) {
        await syncPoints(state.activity.id);
      }

      // Stop GPS — no new points arrive after this
      await stopGpsTracking();

      // Remaining unsynced points from the SQLite log go atomically with finish
      const finalPoints = clientActivityIdRef.current
        ? toGpsPoints(trackingDb.getUnsyncedPoints(clientActivityIdRef.current, 100000))
        : [];

      // Use last GPS timestamp as ended_at (instead of current time)
      const lastTimestamp = gpsTracker.lastPosition?.timestamp;
      const endedAt = lastTimestamp
        ? new Date(lastTimestamp).toISOString()
        : new Date().toISOString();

      logger.activity('Using GPS timestamp for ended_at', {
        endedAt,
        difference: Date.now() - (lastTimestamp || Date.now()),
        finalPointsCount: finalPoints.length,
      });

      // Finish on server with GPS timestamp + remaining pending points
      const response = await api.finishActivity(state.activity.id, {
        ...data,
        ended_at: endedAt,
        location: activityLocationRef.current ?? undefined,
        final_points: finalPoints.length > 0 ? finalPoints : undefined,
        client_distance: clientDistance,
        client_activity_id: clientActivityIdRef.current ?? undefined,
      });

      const activity = response.data;

      // Close the durable SQLite session (points purged after retention window)
      if (clientActivityIdRef.current) {
        trackingDb.markSessionFinished(clientActivityIdRef.current);
        clientActivityIdRef.current = null;
      }

      logger.activity('Activity finished with GPS duration', {
        id: activity.id,
        distance: activity.distance,
        client_distance: activity.client_distance,
        duration: activity.duration,
        hasGpsTrack: activity.has_gps_track,
      });

      // Reset state and pace tracking
      localStatsRef.current = { ...initialStats };
      gpsTracker.lastPosition = null;
      allRoutePoints.current = [];
      pointsVersionRef.current++;
      pausedDuration.current = 0;
      trackingStartTime.current = null;
      activityLocationRef.current = null;
      paceTracker.reset();

      setState({
        activity: null,
        isTracking: false,
        isPaused: false,
        isLoading: false,
        error: null,
        currentStats: { ...initialStats },
        hasExistingActivity: false,
        trackingStatus: {
          gpsSignal: 'good',
          isOnline: true,
          pendingPoints: 0,
          lastSyncTime: null,
          syncError: null,
        },
      });

      return { activity, post: response.post, points_earned: response.points_earned };
    } catch (error: any) {
      logger.error('activity', 'Failed to finish with GPS duration', {
        id: state.activity.id,
        error: error.message,
      });

      // Points remain durable in the SQLite log — recoverable on next start

      await enqueueFailedFinish(error?.message || 'Failed to finish activity');

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to finish activity',
      }));
      throw error;
    } finally {
      isFinishingOrDiscardingRef.current = false;
    }
  };

  // Helper: Finish activity using full timer duration (normal finish)
  const finishWithFullDuration = async (data?: {
    title?: string;
    description?: string;
    calories?: number;
    skip_auto_post?: boolean;
  }): Promise<{ activity: Activity; post?: AutoCreatedPost; points_earned?: number } | null> => {
    if (!state.activity) return null;

    isFinishingOrDiscardingRef.current = true;

    try {
      logger.activity('Finishing with full timer duration', {
        id: state.activity.id,
      });
      setState((prev) => ({ ...prev, isLoading: true }));

      // Capture client distance BEFORE sync (sync overwrites local distance with server value)
      const clientDistance = Math.round(localStatsRef.current.distance);

      // Pre-flush: upload pending points before stopping GPS (reduces final_points payload)
      if (state.activity) {
        await syncPoints(state.activity.id);
      }

      // Stop GPS — no new points arrive after this
      await stopGpsTracking();

      // Remaining unsynced points from the SQLite log go atomically with finish
      const finalPoints = clientActivityIdRef.current
        ? toGpsPoints(trackingDb.getUnsyncedPoints(clientActivityIdRef.current, 100000))
        : [];

      logger.activity('Flushing GPS buffer for finish', {
        id: state.activity.id,
        finalPointsCount: finalPoints.length,
      });

      // Finish on server with current time + remaining pending points
      const response = await api.finishActivity(state.activity.id, {
        ...data,
        ended_at: new Date().toISOString(),
        location: activityLocationRef.current ?? undefined,
        final_points: finalPoints.length > 0 ? finalPoints : undefined,
        client_distance: clientDistance,
        client_activity_id: clientActivityIdRef.current ?? undefined,
      });

      const activity = response.data;

      // Close the durable SQLite session (points purged after retention window)
      if (clientActivityIdRef.current) {
        trackingDb.markSessionFinished(clientActivityIdRef.current);
        clientActivityIdRef.current = null;
      }

      logger.activity('Activity finished with full duration', {
        id: activity.id,
        distance: activity.distance,
        client_distance: activity.client_distance,
        duration: activity.duration,
        hasGpsTrack: activity.has_gps_track,
      });

      // Reset state and pace tracking
      localStatsRef.current = { ...initialStats };
      gpsTracker.lastPosition = null;
      allRoutePoints.current = [];
      pointsVersionRef.current++;
      pausedDuration.current = 0;
      trackingStartTime.current = null;
      activityLocationRef.current = null;
      paceTracker.reset();

      setState({
        activity: null,
        isTracking: false,
        isPaused: false,
        isLoading: false,
        error: null,
        currentStats: { ...initialStats },
        hasExistingActivity: false,
        trackingStatus: {
          gpsSignal: 'good',
          isOnline: true,
          pendingPoints: 0,
          lastSyncTime: null,
          syncError: null,
        },
      });

      return { activity, post: response.post, points_earned: response.points_earned };
    } catch (error: any) {
      logger.error('activity', 'Failed to finish with full duration', {
        id: state.activity.id,
        error: error.message,
      });

      // Points remain durable in the SQLite log — recoverable on next start

      await enqueueFailedFinish(error?.message || 'Failed to finish activity');

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to finish activity',
      }));
      throw error;
    } finally {
      isFinishingOrDiscardingRef.current = false;
    }
  };

  const finishTracking = useCallback(
    async (data?: {
      title?: string;
      description?: string;
      calories?: number;
      skip_auto_post?: boolean;
      event_id?: number | null;
    }): Promise<{ activity: Activity; post?: AutoCreatedPost; points_earned?: number } | null> => {
      if (!state.activity) return null;

      // Guard: prevent concurrent finish/discard calls
      if (isFinishingOrDiscardingRef.current) {
        logger.activity('Finish already in progress, ignoring duplicate call', {
          id: state.activity.id,
        });
        return null;
      }

      isFinishingOrDiscardingRef.current = true;

      try {
        logger.activity('Finishing activity', { id: state.activity.id });

        // Check if GPS stopped a long time ago (> 2 minutes)
        const lastGpsTimestamp = gpsTracker.lastPosition?.timestamp;
        const now = Date.now();

        if (lastGpsTimestamp && now - lastGpsTimestamp > 120000) {
          const gapMinutes = Math.floor((now - lastGpsTimestamp) / 60000);

          logger.activity('GPS stopped significantly before finish', {
            gapMinutes,
            lastGpsTime: new Date(lastGpsTimestamp).toISOString(),
            finishTime: new Date(now).toISOString(),
          });

          // Reset the guard flag before showing alert (user might cancel)
          isFinishingOrDiscardingRef.current = false;

          // Show warning dialog to user
          return new Promise<{
            activity: Activity;
            post?: AutoCreatedPost;
            points_earned?: number;
          } | null>((resolve) => {
            Alert.alert(
              'GPS Tracking Stopped',
              `GPS tracking stopped ${gapMinutes} minute${gapMinutes > 1 ? 's' : ''} ago. The timer kept running after GPS stopped.\n\nWhich duration should be used?`,
              [
                {
                  text: 'Use GPS Time (Recommended)',
                  onPress: async () => {
                    try {
                      const result = await finishWithGpsDuration(data);
                      resolve(result);
                    } catch (error) {
                      resolve(null);
                      throw error;
                    }
                  },
                },
                {
                  text: 'Use Full Timer',
                  onPress: async () => {
                    try {
                      const result = await finishWithFullDuration(data);
                      resolve(result);
                    } catch (error) {
                      resolve(null);
                      throw error;
                    }
                  },
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => resolve(null),
                },
              ],
            );
          });
        }

        setState((prev) => ({ ...prev, isLoading: true }));

        // Capture client distance BEFORE sync (sync overwrites local distance with server value)
        const clientDistance = Math.round(localStatsRef.current.distance);

        // Pre-flush: upload pending points before stopping GPS (reduces final_points payload)
        if (state.activity) {
          await syncPoints(state.activity.id);
        }

        // Stop GPS — no new points arrive after this
        await stopGpsTracking();

        // Remaining unsynced points from the SQLite log go atomically with finish
        const finalPoints = clientActivityIdRef.current
          ? toGpsPoints(trackingDb.getUnsyncedPoints(clientActivityIdRef.current, 100000))
          : [];

        logger.activity('Flushing GPS buffer for finish', {
          id: state.activity.id,
          finalPointsCount: finalPoints.length,
          clientDistance,
        });

        // Finish on server - include location and remaining pending points
        const response = await api.finishActivity(state.activity.id, {
          ...data,
          ended_at: new Date().toISOString(),
          location: activityLocationRef.current ?? undefined,
          final_points: finalPoints.length > 0 ? finalPoints : undefined,
          client_distance: clientDistance,
          client_activity_id: clientActivityIdRef.current ?? undefined,
        });

        const activity = response.data;

        // Close the durable SQLite session (points purged after retention window)
        if (clientActivityIdRef.current) {
          trackingDb.markSessionFinished(clientActivityIdRef.current);
          clientActivityIdRef.current = null;
        }

        logger.activity('Activity finished successfully', {
          id: activity.id,
          distance: activity.distance,
          client_distance: activity.client_distance,
          duration: activity.duration,
          hasGpsTrack: activity.has_gps_track,
          hasPost: !!response.post,
          postStatus: response.post?.status,
        });

        // Reset state and pace tracking
        localStatsRef.current = { ...initialStats };
        gpsTracker.lastPosition = null;
        allRoutePoints.current = [];
        pointsVersionRef.current++;
        pausedDuration.current = 0;
        trackingStartTime.current = null;
        activityLocationRef.current = null;
        paceTracker.reset();

        setState({
          activity: null,
          isTracking: false,
          isPaused: false,
          isLoading: false,
          error: null,
          currentStats: { ...initialStats },
          hasExistingActivity: false,
          trackingStatus: {
            gpsSignal: 'good',
            isOnline: true,
            pendingPoints: 0,
            lastSyncTime: null,
            syncError: null,
          },
        });

        return { activity, post: response.post, points_earned: response.points_earned };
      } catch (error: any) {
        logger.error('activity', 'Failed to finish activity', {
          id: state.activity.id,
          error: error.message,
        });

        // Points remain durable in the SQLite log — recoverable on next start

        await enqueueFailedFinish(error?.message || 'Failed to finish activity');

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to finish activity',
        }));
        throw error;
      } finally {
        // Always reset the guard flag
        isFinishingOrDiscardingRef.current = false;
      }
    },
    [state.activity],
  );

  const discardTracking = useCallback(async () => {
    if (!state.activity) return;

    // Guard: prevent concurrent finish/discard calls
    if (isFinishingOrDiscardingRef.current) {
      logger.activity('Discard already in progress, ignoring duplicate call', {
        id: state.activity.id,
      });
      return;
    }

    isFinishingOrDiscardingRef.current = true;

    try {
      logger.activity('Discarding activity', { id: state.activity.id });
      setState((prev) => ({ ...prev, isLoading: true }));

      // Stop GPS
      await stopGpsTracking();

      // Drop the durable SQLite session and its points
      if (clientActivityIdRef.current) {
        trackingDb.discardSession(clientActivityIdRef.current);
        clientActivityIdRef.current = null;
      }

      // Discard on server
      await api.discardActivity(state.activity.id);

      logger.activity('Activity discarded', { id: state.activity.id });

      // Reset state and pace tracking
      localStatsRef.current = { ...initialStats };
      gpsTracker.lastPosition = null;
      allRoutePoints.current = [];
      pointsVersionRef.current++;
      pausedDuration.current = 0;
      trackingStartTime.current = null;
      activityLocationRef.current = null;
      paceTracker.reset();

      setState({
        activity: null,
        isTracking: false,
        isPaused: false,
        isLoading: false,
        error: null,
        currentStats: { ...initialStats },
        hasExistingActivity: false,
        trackingStatus: {
          gpsSignal: 'good',
          isOnline: true,
          pendingPoints: 0,
          lastSyncTime: null,
          syncError: null,
        },
      });
    } catch (error: any) {
      logger.error('activity', 'Failed to discard activity', {
        id: state.activity.id,
        error: error.message,
      });
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to discard activity',
      }));
      throw error;
    } finally {
      // Always reset the guard flag
      isFinishingOrDiscardingRef.current = false;
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
    // Expose GPS profile for UI to access pace settings (minDistanceForPace, etc.)
    gpsProfile: currentGpsProfile.current,
    // Expose for map view (all accumulated route points, never cleared on sync)
    // Return ref directly — consumers use livePointsVersion to detect changes
    // (avoids O(n) array copy on every render from duration timer)
    livePoints: allRoutePoints.current,
    livePointsVersion: pointsVersionRef.current,
    currentPosition: gpsTracker.currentPosition,
  };
}

// Context type
interface LiveActivityContextType {
  activity: Activity | null;
  isTracking: boolean;
  isPaused: boolean;
  isLoading: boolean;
  error: string | null;
  currentStats: LiveActivityStats;
  hasExistingActivity: boolean;
  trackingStatus: TrackingStatus;
  gpsProfile: GpsProfile;
  startTracking: (
    sportTypeId: number,
    title?: string,
    eventId?: number,
  ) => Promise<Activity | undefined>;
  pauseTracking: () => Promise<void>;
  resumeTracking: () => Promise<void>;
  finishTracking: (data?: {
    title?: string;
    description?: string;
    calories?: number;
    skip_auto_post?: boolean;
    event_id?: number | null;
  }) => Promise<{ activity: Activity; post?: AutoCreatedPost; points_earned?: number } | null>;
  discardTracking: () => Promise<void>;
  clearError: () => void;
  checkExistingActivity: () => Promise<void>;
  // Expose for map view
  livePoints: GpsPoint[];
  livePointsVersion: number;
  currentPosition: { lat: number; lng: number } | null;
}

// Create Context
const LiveActivityContext = createContext<LiveActivityContextType | null>(null);

// Provider Component
export function LiveActivityProvider({ children }: { children: React.ReactNode }) {
  const liveActivityState = useLiveActivityInternal();

  return React.createElement(LiveActivityContext.Provider, { value: liveActivityState }, children);
}

// Hook to use the context (replaces the direct hook usage)
export function useLiveActivityContext() {
  const context = useContext(LiveActivityContext);
  if (!context) {
    throw new Error('useLiveActivityContext must be used within LiveActivityProvider');
  }
  return context;
}
