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

export function useActivityStats(sportTypeId?: number): UseActivityStatsResult {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Calculate date range for last 7 days
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      // Format dates as YYYY-MM-DD
      const to = today.toISOString().split('T')[0];
      const from = sevenDaysAgo.toISOString().split('T')[0];

      const data = await api.getActivityStats({
        from,
        to,
        ...(sportTypeId && { sport_type_id: sportTypeId }),
      });
      setStats(data);
    } catch (err: any) {
      logger.error('activity', 'Failed to fetch activity stats', { error: err });
      setError(err.message || 'Failed to load statistics');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [sportTypeId, isAuthenticated]);

  useEffect(() => {
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
