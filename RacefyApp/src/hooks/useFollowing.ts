import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './useAuth';
import type { User } from '../types/api';

interface UseFollowingResult {
  following: User[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFollowing(): UseFollowingResult {
  const { user, isAuthenticated } = useAuth();
  const [following, setFollowing] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowing = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setFollowing([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getFollowing(user.id);
      setFollowing(data);
    } catch (err) {
      console.error('Failed to fetch following:', err);
      setError('Failed to load following list');
      setFollowing([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  return {
    following,
    isLoading,
    error,
    refetch: fetchFollowing,
  };
}
