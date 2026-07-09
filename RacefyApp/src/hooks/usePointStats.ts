import { api } from '../services/api';
import { useFetch } from './useFetch';
import type { UserPointStats } from '../types/api';

interface UsePointStatsResult {
  stats: UserPointStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePointStats(): UsePointStatsResult {
  const { data, isLoading, error, refetch } = useFetch<UserPointStats>(
    () => api.getMyPointStats(),
    {
      errorMessage: 'Failed to load points',
    },
  );

  return { stats: data, isLoading, error, refetch };
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
  const { data, isLoading, error, refetch } = useFetch<UserPointStats>(
    () => api.getUserPointStats(username as string).then((res) => res.stats),
    {
      enabled: autoLoad && !!username,
      deps: [username],
      errorMessage: 'Failed to load points',
    },
  );

  return { stats: data, isLoading, error, refetch };
}
