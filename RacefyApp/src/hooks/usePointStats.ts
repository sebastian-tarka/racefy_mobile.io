import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { UserPointStats } from '../types/api';

interface UsePointStatsResult {
  stats: UserPointStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePointStats(): UsePointStatsResult {
  const [stats, setStats] = useState<UserPointStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getMyPointStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to fetch point stats:', err);
      setError(err.message || 'Failed to load points');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
