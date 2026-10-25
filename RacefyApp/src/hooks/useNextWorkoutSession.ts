import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { useRefreshOn } from '../services/refreshEvents';
import { useFetch } from './useFetch';
import type { NextWorkoutSession } from '../types/workouts';

/**
 * The strength workout Home offers next (GET /workout-sessions/next).
 * Re-checked on focus and on the `workouts` refresh event, so finishing or
 * skipping a session moves the card on by the time the athlete is back.
 */
export function useNextWorkoutSession(enabled = true) {
  const result = useFetch<NextWorkoutSession>(() => api.getNextWorkoutSession(), {
    enabled,
    logCategory: 'api',
  });
  const { refetch } = result;
  const onRefresh = useCallback(() => {
    if (enabled) void refetch();
  }, [enabled, refetch]);
  useFocusEffect(onRefresh);
  useRefreshOn('workouts', onRefresh);
  return { next: result.data, refetch };
}
