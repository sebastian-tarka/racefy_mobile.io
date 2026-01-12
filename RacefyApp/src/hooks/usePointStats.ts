import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
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
      logger.error('api', 'Failed to fetch point stats', { error: err });
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

interface UseUserPointStatsOptions {
  username: string | null;
  autoLoad?: boolean;
}

interface UseUserPointStatsResult {
  stats: UserPointStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserPointStats({
  username,
  autoLoad = true,
}: UseUserPointStatsOptions): UseUserPointStatsResult {
  const [stats, setStats] = useState<UserPointStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!username) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getUserPointStats(username);
      setStats(data.stats);
    } catch (err: any) {
      logger.error('api', 'Failed to fetch user point stats', { error: err });
      setError(err.message || 'Failed to load points');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (autoLoad && username) {
      fetchStats();
    }
  }, [autoLoad, username, fetchStats]);

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
