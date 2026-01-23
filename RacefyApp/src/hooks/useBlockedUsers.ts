import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { BlockedUser } from '../types/api';

interface UseBlockedUsersReturn {
  blockedUsers: BlockedUser[];
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  totalUsers: number;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  removeUser: (userId: number) => void;
}

/**
 * Hook for managing paginated blocked users list
 * Features:
 * - Paginated list (20 per page)
 * - Pull-to-refresh support
 * - Load more on scroll
 * - Optimistic removal after unblock
 * - Error handling
 */
export function useBlockedUsers(): UseBlockedUsersReturn {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const hasMore = currentPage < lastPage;

  const fetchBlockedUsers = useCallback(
    async (page: number, append: boolean = false) => {
      try {
        const response = await api.getBlockedUsers({ page, per_page: 20 });

        if (append) {
          setBlockedUsers((prev) => [...prev, ...response.data]);
        } else {
          setBlockedUsers(response.data);
        }

        setCurrentPage(response.meta.current_page);
        setLastPage(response.meta.last_page);
        setTotalUsers(response.meta.total);
        setError(null);

        logger.debug('auth', 'Fetched blocked users', {
          page: response.meta.current_page,
          total: response.meta.total,
        });
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to load blocked users';
        setError(errorMessage);
        logger.error('auth', 'Failed to fetch blocked users', { page, error: err });
        throw err;
      }
    },
    []
  );

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchBlockedUsers(1, false);
    } catch (err) {
      // Error already handled in fetchBlockedUsers
    } finally {
      setIsLoading(false);
    }
  }, [fetchBlockedUsers]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchBlockedUsers(1, false);
    } catch (err) {
      // Error already handled in fetchBlockedUsers
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchBlockedUsers]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      await fetchBlockedUsers(currentPage + 1, true);
    } catch (err) {
      // Error already handled in fetchBlockedUsers
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, currentPage, fetchBlockedUsers]);

  // Optimistic removal after unblock
  const removeUser = useCallback((userId: number) => {
    setBlockedUsers((prev) => prev.filter((user) => user.id !== userId));
    setTotalUsers((prev) => Math.max(0, prev - 1));
    logger.debug('auth', 'Removed blocked user from list', { userId });
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return {
    blockedUsers,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    hasMore,
    currentPage,
    totalUsers,
    refresh,
    loadMore,
    removeUser,
  };
}
