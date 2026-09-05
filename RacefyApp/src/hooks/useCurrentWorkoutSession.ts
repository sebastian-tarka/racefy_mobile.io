import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { useRefreshOn } from '../services/refreshEvents';
import { useFetch } from './useFetch';
import type { WorkoutSession } from '../types/workouts';

/**
 * The athlete's in-progress strength session, if any — drives the "Resume"
 * banners. Re-checked on focus and on the `workouts` refresh event.
 */
export function useCurrentWorkoutSession(enabled = true) {
  const result = useFetch<WorkoutSession | null>(() => api.getCurrentWorkoutSession(), {
    enabled,
    logCategory: 'api',
  });
  const { refetch } = result;
  const onRefresh = useCallback(() => {
    if (enabled) void refetch();
  }, [enabled, refetch]);
  useFocusEffect(onRefresh);
  useRefreshOn('workouts', onRefresh);
  return { current: result.data, isLoading: result.isLoading, refetch };
}
