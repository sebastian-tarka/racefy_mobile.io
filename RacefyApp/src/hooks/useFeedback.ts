import { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { Feedback, FeedbackStatus, FeedbackType } from '../types/api';

export function useFeedback() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageRef = useRef(1);
  const isLoadingRef = useRef(false);
  const filtersRef = useRef<{ status?: FeedbackStatus; type?: FeedbackType }>({});

  const fetchFeedbacks = useCallback(async (reset = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    if (reset) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const currentPage = reset ? 1 : pageRef.current;
      const response = await api.getFeedbacks({
        page: currentPage,
        per_page: 15,
        ...filtersRef.current,
      });
      const data = response.data;
      const meta = response.meta;

      setFeedbacks((prev) => {
        if (reset) return data;
        const existingIds = new Set(prev.map((f) => f.id));
        const newItems = data.filter((f) => !existingIds.has(f.id));
        return [...prev, ...newItems];
      });
      setHasMore(meta.current_page < meta.last_page);
      pageRef.current = currentPage + 1;
    } catch (err) {
      logger.error('api', 'Failed to fetch feedbacks', { error: err });
      setError('Failed to load feedbacks');
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => fetchFeedbacks(true), [fetchFeedbacks]);
  const loadMore = useCallback(
    () => hasMore && fetchFeedbacks(false),
    [hasMore, fetchFeedbacks]
  );

  const setFilters = useCallback(
    (filters: { status?: FeedbackStatus; type?: FeedbackType }) => {
      filtersRef.current = filters;
      pageRef.current = 1;
      fetchFeedbacks(true);
    },
    [fetchFeedbacks]
  );

  return {
    feedbacks,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    refresh,
    loadMore,
    setFilters,
  };
}
