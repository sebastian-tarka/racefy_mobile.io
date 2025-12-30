import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { ActivityStats } from '../types/api';

interface UseActivityStatsResult {
  stats: ActivityStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useActivityStats(sportTypeId?: number): UseActivityStatsResult {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getActivityStats(
        sportTypeId ? { sport_type_id: sportTypeId } : undefined
      );
      setStats(data);
    } catch (err: any) {
      console.error('Failed to fetch activity stats:', err);
      setError(err.message || 'Failed to load statistics');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [sportTypeId]);

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
