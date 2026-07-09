import { api } from '../services/api';
import { useAuth } from './useAuth';
import { useFetch } from './useFetch';
import type { ActivityStats, ActivityStatsPeriod } from '../types/api';

interface UseActivityStatsResult {
  stats: ActivityStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseActivityStatsParams {
  period?: ActivityStatsPeriod | null;
  sportTypeId?: number | null;
  from?: string | null;
  to?: string | null;
}

export function useActivityStats(params?: UseActivityStatsParams): UseActivityStatsResult {
  const { isAuthenticated } = useAuth();

  // Extract values for stable dependencies
  const period = params?.period ?? null;
  const sportTypeId = params?.sportTypeId ?? null;
  const from = params?.from ?? null;
  const to = params?.to ?? null;

  const { data, isLoading, error, refetch } = useFetch<ActivityStats>(
    () => {
      const apiParams: {
        period?: ActivityStatsPeriod;
        from?: string;
        to?: string;
        sport_type_id?: number;
      } = {};
      if (period) {
        apiParams.period = period;
      } else {
        if (from) apiParams.from = from;
        if (to) apiParams.to = to;
      }
      if (sportTypeId) apiParams.sport_type_id = sportTypeId;
      return api.getActivityStats(apiParams);
    },
    {
      enabled: isAuthenticated,
      deps: [period, sportTypeId, from, to],
      logCategory: 'activity',
      errorMessage: 'Failed to load statistics',
    },
  );

  return { stats: data, isLoading, error, refetch };
}
