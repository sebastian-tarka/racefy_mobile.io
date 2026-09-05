import { useCallback } from 'react';
import { api } from '../services/api';
import { useRefreshOn } from '../services/refreshEvents';
import { useFetch } from './useFetch';
import type { WorkoutPlan } from '../types/workouts';

/**
 * One strength plan with its full tree (workouts → prescriptions → exercises).
 * Re-fetches on the `workouts` refresh event, which every mutation screen emits.
 */
export function useWorkoutPlan(planId: number | undefined) {
  const result = useFetch<WorkoutPlan>(() => api.getWorkoutPlan(planId as number), {
    enabled: planId != null,
    deps: [planId],
    logCategory: 'api',
  });
  const { refetch } = result;
  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);
  useRefreshOn('workouts', onRefresh);
  return result;
}
