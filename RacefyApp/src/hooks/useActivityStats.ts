import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { useAuth } from './useAuth';
import type { ActivityStats } from '../types/api';

interface UseActivityStatsResult {
  stats: ActivityStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseActivityStatsParams {
  sportTypeId?: number | null;
  from?: string | null;
  to?: string | null;
}

export function useActivityStats(params?: UseActivityStatsParams): UseActivityStatsResult {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract values for dependencies
  const sportTypeId = params?.sportTypeId ?? null;
  const from = params?.from ?? null;
  const to = params?.to ?? null;

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiParams: { from?: string; to?: string; sport_type_id?: number } = {};
      if (from) apiParams.from = from;
      if (to) apiParams.to = to;
      if (sportTypeId) apiParams.sport_type_id = sportTypeId;

      logger.info('activity', 'Fetching activity stats', apiParams);

      const data = await api.getActivityStats(apiParams);
      setStats(data);

      logger.info('activity', 'Activity stats fetched successfully', {
        hasBySportType: !!data.by_sport_type,
        count: data.count,
      });
    } catch (err: any) {
      logger.error('activity', 'Failed to fetch activity stats', { error: err });
      setError(err.message || 'Failed to load statistics');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [sportTypeId, from, to, isAuthenticated]);

  useEffect(() => {
    logger.debug('activity', 'useActivityStats effect triggered', { sportTypeId, from, to });
    fetchStats();
  }, [fetchStats]);

  const refetch = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}
