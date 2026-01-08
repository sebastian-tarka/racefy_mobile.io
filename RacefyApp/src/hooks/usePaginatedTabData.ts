import { useState, useCallback } from 'react';
import { logger } from '../services/logger';
import type { PaginatedResponse } from '../types/api';

interface UsePaginatedTabDataOptions<T> {
  fetchFunction: (userId: number, page: number) => Promise<PaginatedResponse<T>>;
  userId: number | null;
}

interface UsePaginatedTabDataReturn<T> {
  data: T[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  fetchData: (pageNumber: number, refresh?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => void;
  reset: () => void;
}

export function usePaginatedTabData<T>({
  fetchFunction,
  userId,
}: UsePaginatedTabDataOptions<T>): UsePaginatedTabDataReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (pageNumber: number, refresh = false) => {
      if (isLoading || !userId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchFunction(userId, pageNumber);

        if (refresh) {
          setData(response.data);
        } else {
          setData((prev) => [...prev, ...response.data]);
        }

        setHasMore(response.meta.current_page < response.meta.last_page);
        setPage(pageNumber);
      } catch (err) {
        logger.error('api', 'Failed to fetch paginated data:', { err });
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    },
    [fetchFunction, userId, isLoading]
  );

  const refresh = useCallback(async () => {
    setPage(1);
    setHasMore(true);
    await fetchData(1, true);
  }, [fetchData]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchData(page + 1);
    }
  }, [hasMore, isLoading, page, fetchData]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    data,
    page,
    hasMore,
    isLoading,
    error,
    fetchData,
    refresh,
    loadMore,
    reset,
  };
}