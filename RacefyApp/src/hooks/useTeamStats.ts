import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { TeamSummaryResponse, StatsPeriod } from '../types/api';

interface UseTeamStatsResult {
  stats: TeamSummaryResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTeamStats(slug: string, period: StatsPeriod = 'this_month'): UseTeamStatsResult {
  const [stats, setStats] = useState<TeamSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getTeamStats(slug, period);
      setStats(data);
    } catch (err: any) {
      logger.error('general', 'Failed to fetch team stats', { slug, error: err });
      if (err?.status === 403) {
        setError('private');
      } else {
        setError(err.message || 'Failed to load team stats');
      }
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [slug, period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}