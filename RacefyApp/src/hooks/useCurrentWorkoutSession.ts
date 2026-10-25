import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { useRefreshOn } from '../services/refreshEvents';
import { strengthOutbox } from '../services/strength/strengthOutbox';
import { useFetch } from './useFetch';
import type { WorkoutSession } from '../types/workouts';

/**
 * The athlete's in-progress strength session, if any — drives the "Resume"
 * banners. Re-checked on focus and on the `workouts` refresh event.
 *
 * The phone's copy wins where the server is behind: a session finished offline
 * is not offered for resuming, one with queued sets shows their progress, and
 * without a network the open session still has its banner.
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
  return {
    current: withLocalState(result.data, result.error),
    isLoading: result.isLoading,
    refetch,
  };
}

function withLocalState(
  server: WorkoutSession | null,
  error: string | null,
): WorkoutSession | null {
  const snapshot = strengthOutbox.readSnapshot();
  if (server) {
    if (strengthOutbox.hasPendingComplete(server.id)) return null;
    return snapshot?.id === server.id && strengthOutbox.hasPending(server.id) ? snapshot : server;
  }
  if (error && snapshot?.status === 'in_progress') return snapshot;
  return null;
}
