import { useState, useEffect, useRef } from 'react';
import type { Activity } from '../types/api';
import { logger } from '../services/logger';

/**
 * Custom hook to manage activity timer synchronization
 * Keeps a local timer in sync with server activity state
 *
 * Key design decisions:
 * - Stores lastKnownDuration locally to preserve time when pausing
 * - Uses pauseStartTime to track pause duration locally
 * - Falls back to local calculation if server values seem incorrect
 */
export function useActivityTimer(
  activity: Activity | null,
  isTracking: boolean,
  isPaused: boolean
) {
  const [localDuration, setLocalDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Store the last known duration before pausing (to avoid resetting to 0)
  const lastKnownDurationRef = useRef<number>(0);

  // Store the time when pause started (for local pause duration calculation)
  const pauseStartTimeRef = useRef<number | null>(null);

  // Store accumulated pause duration locally
  const localPausedDurationRef = useRef<number>(0);

  // Track previous state to detect transitions
  const wasTrackingRef = useRef<boolean>(false);
  const wasPausedRef = useRef<boolean>(false);

  // Sync local timer with activity state
  useEffect(() => {
    const prevWasTracking = wasTrackingRef.current;
    const prevWasPaused = wasPausedRef.current;

    // Update previous state refs
    wasTrackingRef.current = isTracking;
    wasPausedRef.current = isPaused;

    if (activity && isTracking && !isPaused) {
      // RUNNING state

      // Check if we're resuming from pause
      if (prevWasPaused && pauseStartTimeRef.current) {
        // Calculate how long we were paused locally
        const pauseDurationMs = Date.now() - pauseStartTimeRef.current;
        const pauseDurationSec = Math.floor(pauseDurationMs / 1000);
        localPausedDurationRef.current += pauseDurationSec;
        pauseStartTimeRef.current = null;

        logger.debug('activity', 'Resumed from pause', {
          pauseDuration: pauseDurationSec,
          totalLocalPausedDuration: localPausedDurationRef.current,
          serverPausedDuration: activity.total_paused_duration,
        });
      }

      // Calculate start time reference
      const activityStart = new Date(activity.started_at).getTime();

      // Use the LARGER of server paused duration or local tracked paused duration
      // This handles cases where server might not have updated total_paused_duration yet
      const serverPausedMs = (activity.total_paused_duration || 0) * 1000;
      const localPausedMs = localPausedDurationRef.current * 1000;
      const pausedMs = Math.max(serverPausedMs, localPausedMs);

      startTimeRef.current = activityStart + pausedMs;

      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const safeDuration = Math.max(0, elapsed);
        setLocalDuration(safeDuration);
        // Always track the last known duration while running
        lastKnownDurationRef.current = safeDuration;
      }, 100);

    } else if (isPaused && activity) {
      // PAUSED state

      // Clear the running interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Record when pause started (if transitioning from running to paused)
      if (prevWasTracking && !prevWasPaused) {
        pauseStartTimeRef.current = Date.now();
        logger.debug('activity', 'Pause started', {
          lastKnownDuration: lastKnownDurationRef.current,
          serverDuration: activity.duration,
        });
      }

      // Use the LARGER of:
      // 1. Our locally tracked duration (most accurate during session)
      // 2. Server-provided duration (might be more accurate after app restart)
      const serverDuration = activity.duration || 0;
      const durationToShow = Math.max(lastKnownDurationRef.current, serverDuration);

      // Only log if there's a significant discrepancy
      if (Math.abs(serverDuration - lastKnownDurationRef.current) > 5) {
        logger.warn('activity', 'Duration discrepancy detected', {
          serverDuration,
          localDuration: lastKnownDurationRef.current,
          using: durationToShow,
        });
      }

      setLocalDuration(durationToShow);
      // Update lastKnownDuration in case server has a better value
      lastKnownDurationRef.current = durationToShow;

    } else if (!activity) {
      // IDLE state - reset everything

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setLocalDuration(0);
      lastKnownDurationRef.current = 0;
      pauseStartTimeRef.current = null;
      localPausedDurationRef.current = 0;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activity, isTracking, isPaused]);

  // Initialize from activity when first loaded (e.g., after app restart)
  useEffect(() => {
    if (activity && !isTracking && !isPaused && activity.duration > 0) {
      // Activity exists but not tracking - use server duration as baseline
      lastKnownDurationRef.current = activity.duration;
      localPausedDurationRef.current = activity.total_paused_duration || 0;
      logger.debug('activity', 'Initialized timer from existing activity', {
        duration: activity.duration,
        pausedDuration: activity.total_paused_duration,
      });
    }
  }, [activity?.id]); // Only run when activity ID changes

  return { localDuration };
}