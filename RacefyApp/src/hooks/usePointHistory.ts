import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type {
  PointTransaction,
  PointTransactionType,
  PointHistoryPagination,
} from '../types/api';

interface UsePointHistoryOptions {
  type?: PointTransactionType;
  limit?: number;
  autoLoad?: boolean;
}

interface UsePointHistoryResult {
  transactions: PointTransaction[];
  pagination: PointHistoryPagination | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function usePointHistory({
  type,
  limit = 20,
  autoLoad = true,
}: UsePointHistoryOptions = {}): UsePointHistoryResult {
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [pagination, setPagination] = useState<PointHistoryPagination | null>(null);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (page = 1, append = false) => {
    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const response = await api.getPointHistory(page, limit, type);

      if (append) {
        setTransactions((prev) => [...prev, ...response.transactions]);
      } else {
        setTransactions(response.transactions);
      }
      setPagination(response.pagination);
    } catch (err: any) {
      logger.error('api', 'Failed to fetch point history', { error: err, page, type });
      setError(err.message || 'Failed to load point history');
      if (!append) {
        setTransactions([]);
        setPagination(null);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [type, limit]);

  useEffect(() => {
    if (autoLoad) {
      fetchHistory(1, false);
    }
  }, [fetchHistory, autoLoad]);

  const refetch = useCallback(async () => {
    await fetchHistory(1, false);
  }, [fetchHistory]);

  const loadMore = useCallback(async () => {
    if (!pagination || pagination.current_page >= pagination.last_page || isLoadingMore) {
      return;
    }
    await fetchHistory(pagination.current_page + 1, true);
  }, [pagination, isLoadingMore, fetchHistory]);

  const hasMore = pagination ? pagination.current_page < pagination.last_page : false;

  return {
    transactions,
    pagination,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    refetch,
    loadMore,
  };
}