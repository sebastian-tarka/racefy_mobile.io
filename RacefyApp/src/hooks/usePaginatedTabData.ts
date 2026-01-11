import { useState, useCallback, useRef } from 'react';
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

  // Use ref to track loading state without causing callback recreation
  const isLoadingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);

  const fetchData = useCallback(
    async (pageNumber: number, refresh = false) => {
      if (isLoadingRef.current || !userId) return;

      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchFunction(userId, pageNumber);

        if (refresh) {
          setData(response.data);
        } else {
          setData((prev) => [...prev, ...response.data]);
        }

        const newHasMore = response.meta.current_page < response.meta.last_page;
        setHasMore(newHasMore);
        hasMoreRef.current = newHasMore;
        setPage(pageNumber);
        pageRef.current = pageNumber;
      } catch (err) {
        logger.error('api', 'Failed to fetch paginated data:', { err });
        setError('Failed to load data');
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [fetchFunction, userId]
  );

  const refresh = useCallback(async () => {
    setPage(1);
    pageRef.current = 1;
    setHasMore(true);
    hasMoreRef.current = true;
    await fetchData(1, true);
  }, [fetchData]);

  const loadMore = useCallback(() => {
    if (hasMoreRef.current && !isLoadingRef.current) {
      fetchData(pageRef.current + 1);
    }
  }, [fetchData]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    pageRef.current = 1;
    setHasMore(true);
    hasMoreRef.current = true;
    setIsLoading(false);
    isLoadingRef.current = false;
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