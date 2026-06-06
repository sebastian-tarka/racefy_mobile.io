import { useCallback, useEffect, useRef, useState } from 'react';
import type { DependencyList, Dispatch, SetStateAction } from 'react';
import { logger } from '../services/logger';
import type { LogCategory } from '../services/logger';
import type { PaginatedResponse } from '../types/api';

/**
 * Generic paginated list hook. Consolidates the page/hasMore/isLoading/
 * isRefreshing pattern duplicated across useFeed, useEvents, useLeaderboard,
 * useEventCommentaryFeed, etc.
 *
 * The caller supplies `fetchPage(page)` returning a Laravel-style
 * `PaginatedResponse<T>`. The hook tracks pagination, exposes distinct
 * loading/refreshing/loadingMore flags, optionally de-dupes appended items,
 * and resets to page 1 whenever `deps` change.
 *
 * Race-safe: a monotonic request id discards stale responses (e.g. a slow
 * page-2 resolving after a refresh has already replaced the list).
 *
 * @example
 * const feed = usePaginatedFetch(
 *   (page) => api.getFeed(page),
 *   { dedupeBy: (p) => p.id, logCategory: 'api' },
 * );
 * // feed.data, feed.isLoading, feed.loadMore(), feed.refresh(), feed.hasMore
 */
interface UsePaginatedFetchOptions<T> {
  /** When false no request is made (list stays empty). Default true. */
  enabled?: boolean;
  /** Reset to page 1 and refetch whenever any of these change. */
  deps?: DependencyList;
  /** De-dupe appended pages by a stable key (guards against overlapping pages). */
  dedupeBy?: (item: T) => string | number;
  /** Logger category used when a request fails. Default 'api'. */
  logCategory?: LogCategory;
  /** Fallback message when the thrown error carries none. */
  errorMessage?: string;
}

interface UsePaginatedFetchResult<T> {
  data: T[];
  /** Loading the first page (no data yet). */
  isLoading: boolean;
  /** Pull-to-refresh in progress (replacing the list). */
  isRefreshing: boolean;
  /** Appending a subsequent page. */
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  loadMore: () => void;
  refresh: () => Promise<void>;
  reset: () => void;
  setData: Dispatch<SetStateAction<T[]>>;
}

export function usePaginatedFetch<T>(
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>,
  options: UsePaginatedFetchOptions<T> = {},
): UsePaginatedFetchResult<T> {
  const { enabled = true, deps = [], dedupeBy, logCategory = 'api', errorMessage } = options;

  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs mirror state so callbacks stay stable and free of stale closures.
  const fetchPageRef = useRef(fetchPage);
  fetchPageRef.current = fetchPage;
  const dedupeByRef = useRef(dedupeBy);
  dedupeByRef.current = dedupeBy;
  const isLoadingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mergeDeduped = useCallback((prev: T[], next: T[]): T[] => {
    const keyOf = dedupeByRef.current;
    if (!keyOf) return [...prev, ...next];
    const seen = new Set(prev.map(keyOf));
    return [...prev, ...next.filter((item) => !seen.has(keyOf(item)))];
  }, []);

  const fetchAt = useCallback(
    async (targetPage: number, mode: 'replace' | 'append') => {
      if (!enabled || isLoadingRef.current) return;

      isLoadingRef.current = true;
      const requestId = ++requestIdRef.current;
      if (mode === 'append') setIsLoadingMore(true);
      else if (targetPage === 1 && data.length > 0) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const response = await fetchPageRef.current(targetPage);
        if (!isMountedRef.current || requestId !== requestIdRef.current) return;

        setData((prev) => (mode === 'replace' ? response.data : mergeDeduped(prev, response.data)));

        const more = response.meta.current_page < response.meta.last_page;
        setHasMore(more);
        hasMoreRef.current = more;
        setPage(targetPage);
        pageRef.current = targetPage;
      } catch (err) {
        if (!isMountedRef.current || requestId !== requestIdRef.current) return;
        logger.error(logCategory, 'usePaginatedFetch request failed', { err, targetPage });
        setError(
          err instanceof Error
            ? err.message || (errorMessage ?? 'Failed to load data')
            : (errorMessage ?? 'Failed to load data'),
        );
      } finally {
        if (isMountedRef.current && requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
        isLoadingRef.current = false;
      }
    },
    [enabled, logCategory, errorMessage, mergeDeduped, data.length],
  );

  const refresh = useCallback(async () => {
    hasMoreRef.current = true;
    setHasMore(true);
    await fetchAt(1, 'replace');
  }, [fetchAt]);

  const loadMore = useCallback(() => {
    if (hasMoreRef.current && !isLoadingRef.current) {
      fetchAt(pageRef.current + 1, 'append');
    }
  }, [fetchAt]);

  const reset = useCallback(() => {
    requestIdRef.current++;
    isLoadingRef.current = false;
    pageRef.current = 1;
    hasMoreRef.current = true;
    setData([]);
    setPage(1);
    setHasMore(true);
    setIsLoading(false);
    setIsRefreshing(false);
    setIsLoadingMore(false);
    setError(null);
  }, []);

  // Initial load + reset whenever `enabled` flips or a caller dep changes.
  useEffect(() => {
    if (!enabled) {
      reset();
      return;
    }
    pageRef.current = 1;
    hasMoreRef.current = true;
    fetchAt(1, 'replace');
    // `deps` is a dynamic list; exhaustive-deps cannot verify it statically.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return {
    data,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    hasMore,
    page,
    loadMore,
    refresh,
    reset,
    setData,
  };
}
