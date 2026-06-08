import { api } from '../services/api';
import { useFetch } from './useFetch';
import type { TeamSummaryResponse, StatsPeriod } from '../types/api';

interface UseTeamStatsResult {
  stats: TeamSummaryResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTeamStats(slug: string, period: StatsPeriod = 'this_month'): UseTeamStatsResult {
  const { data, isLoading, error, refetch } = useFetch<TeamSummaryResponse>(
    () =>
      api.getTeamStats(slug, period).catch((err: any) => {
        // Surface a private team as the sentinel error 'private' (consumer checks it).
        if (err?.status === 403) throw new Error('private');
        throw err;
      }),
    {
      enabled: !!slug,
      deps: [slug, period],
      logCategory: 'general',
      errorMessage: 'Failed to load team stats',
    },
  );

  return { stats: data, isLoading, error, refetch };
}
