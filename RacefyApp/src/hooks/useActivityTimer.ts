import { useState, useEffect, useRef } from 'react';
import type { Activity } from '../types/api';

/**
 * Custom hook to manage activity timer synchronization
 * Keeps a local timer in sync with server activity state
 */
export function useActivityTimer(
  activity: Activity | null,
  isTracking: boolean,
  isPaused: boolean
) {
  const [localDuration, setLocalDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  // Sync local timer with activity state
  useEffect(() => {
    if (activity && isTracking && !isPaused) {
      // Start local timer
      const activityStart = new Date(activity.started_at).getTime();
      const pausedMs = (activity.total_paused_duration || 0) * 1000;
      startTimeRef.current = activityStart + pausedMs;

      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setLocalDuration(Math.max(0, elapsed));
      }, 100);
    } else if (isPaused && activity) {
      // When paused, use the activity's duration
      setLocalDuration(activity.duration);
      pausedDurationRef.current = activity.duration;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else if (!activity) {
      // Reset when no activity
      setLocalDuration(0);
      pausedDurationRef.current = 0;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activity, isTracking, isPaused]);

  return { localDuration };
}