import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { TeamTrendsResponse, TrendGranularity } from '../types/api';

interface UseTeamTrendsResult {
  trends: TeamTrendsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTeamTrends(
  slug: string,
  granularity: TrendGranularity = 'weekly',
  periods: number = 8,
  sportTypeId?: number,
): UseTeamTrendsResult {
  const [trends, setTrends] = useState<TeamTrendsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getTeamTrends(slug, {
        granularity,
        periods,
        sport_type_id: sportTypeId,
      });
      setTrends(data);
    } catch (err: any) {
      logger.error('general', 'Failed to fetch team trends', { slug, error: err });
      setError(err.message || 'Failed to load trends');
      setTrends(null);
    } finally {
      setIsLoading(false);
    }
  }, [slug, granularity, periods, sportTypeId]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return { trends, isLoading, error, refetch: fetchTrends };
}