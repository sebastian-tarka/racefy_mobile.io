import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { TeamRankingResponse, RankingSortBy, StatsPeriod } from '../types/api';

interface UseTeamRankingResult {
  ranking: TeamRankingResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTeamRanking(
  slug: string,
  sortBy: RankingSortBy = 'distance',
  period?: StatsPeriod,
  sportTypeId?: number,
): UseTeamRankingResult {
  const [ranking, setRanking] = useState<TeamRankingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRanking = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getTeamRanking(slug, {
        sort_by: sortBy,
        period,
        sport_type_id: sportTypeId,
      });
      setRanking(data);
    } catch (err: any) {
      logger.error('general', 'Failed to fetch team ranking', { slug, error: err });
      setError(err.message || 'Failed to load ranking');
      setRanking(null);
    } finally {
      setIsLoading(false);
    }
  }, [slug, sortBy, period, sportTypeId]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  return { ranking, isLoading, error, refetch: fetchRanking };
}