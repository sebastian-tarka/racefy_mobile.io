import { api } from '../services/api';
import { useAuth } from './useAuth';
import { useFetch } from './useFetch';
import type { User } from '../types/api';

interface UseFollowingResult {
  following: User[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFollowing(): UseFollowingResult {
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading, error, refetch } = useFetch<User[]>(
    () =>
      api.getFollowing(user!.id).catch(() => {
        // Preserve the original fixed, user-friendly message regardless of cause.
        throw new Error('Failed to load following list');
      }),
    {
      enabled: isAuthenticated && !!user?.id,
      deps: [isAuthenticated, user?.id],
      initialData: [],
      logCategory: 'api',
      errorMessage: 'Failed to load following list',
    },
  );

  return { following: data ?? [], isLoading, error, refetch };
}
