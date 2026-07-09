import { api } from '../services/api';
import { useFetch } from './useFetch';
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
  const { data, isLoading, error, refetch } = useFetch<TeamTrendsResponse>(
    () => api.getTeamTrends(slug, { granularity, periods, sport_type_id: sportTypeId }),
    {
      enabled: !!slug,
      deps: [slug, granularity, periods, sportTypeId],
      logCategory: 'general',
      errorMessage: 'Failed to load trends',
    },
  );

  return { trends: data, isLoading, error, refetch };
}
