import { api } from '../services/api';
import { useFetch } from './useFetch';
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
  const { data, isLoading, error, refetch } = useFetch<TeamRankingResponse>(
    () => api.getTeamRanking(slug, { sort_by: sortBy, period, sport_type_id: sportTypeId }),
    {
      enabled: !!slug,
      deps: [slug, sortBy, period, sportTypeId],
      logCategory: 'general',
      errorMessage: 'Failed to load ranking',
    },
  );

  return { ranking: data, isLoading, error, refetch };
}
