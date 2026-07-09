import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { useFetch } from './useFetch';
import type { LeaderboardEntry, LeaderboardPeriod } from '../types/api';

export type LeaderboardType = 'global' | 'following';

interface UseLeaderboardOptions {
  type: LeaderboardType;
  period?: LeaderboardPeriod;
  limit?: number;
  autoLoad?: boolean;
}

interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  period: LeaderboardPeriod;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  changePeriod: (period: LeaderboardPeriod) => void;
}

export function useLeaderboard({
  type,
  period: initialPeriod = 'all_time',
  limit = 50,
  autoLoad = true,
}: UseLeaderboardOptions): UseLeaderboardResult {
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod);

  const { data, isLoading, error, refetch } = useFetch<LeaderboardEntry[]>(
    () =>
      (type === 'global'
        ? api.getGlobalLeaderboard(period, limit)
        : api.getFollowingLeaderboard(period, limit)
      ).then((res) => res.leaderboard),
    {
      enabled: autoLoad,
      deps: [type, period, limit],
      errorMessage: 'Failed to load leaderboard',
    },
  );

  const changePeriod = useCallback((newPeriod: LeaderboardPeriod) => {
    setPeriod(newPeriod);
  }, []);

  return {
    entries: data ?? [],
    period,
    isLoading,
    error,
    refetch,
    changePeriod,
  };
}

// Hook for event-specific leaderboard
interface UseEventLeaderboardOptions {
  eventId: number;
  limit?: number;
  autoLoad?: boolean;
}

interface UseEventLeaderboardResult {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEventLeaderboard({
  eventId,
  limit = 50,
  autoLoad = true,
}: UseEventLeaderboardOptions): UseEventLeaderboardResult {
  const { data, isLoading, error, refetch } = useFetch<LeaderboardEntry[]>(
    () => api.getEventLeaderboard(eventId, limit).then((res) => res.leaderboard),
    {
      enabled: autoLoad && !!eventId,
      deps: [eventId, limit],
      errorMessage: 'Failed to load leaderboard',
    },
  );

  return {
    entries: data ?? [],
    isLoading,
    error,
    refetch,
  };
}
