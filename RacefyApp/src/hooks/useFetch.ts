import { useCallback, useEffect, useRef, useState } from 'react';
import type { DependencyList, Dispatch, SetStateAction } from 'react';
import { logger } from '../services/logger';
import type { LogCategory } from '../services/logger';

/**
 * Generic single-resource fetch hook. Replaces the repeated
 * `useState(data/isLoading/error) + useEffect(fetch) + try/catch` boilerplate
 * that ~30 hooks duplicate.
 *
 * Features:
 * - `enabled` guard (e.g. only fetch when authenticated)
 * - `deps`-driven refetch (re-runs when any dep changes)
 * - stale-response guard: if a newer request starts (or the component unmounts)
 *   before an in-flight one resolves, the older result is discarded — fixes the
 *   race conditions the audit flagged in manual fetch hooks
 * - `setData` exposed for optimistic updates
 *
 * @example
 * const { data: stats, isLoading, error, refetch } = useFetch(
 *   () => api.getActivityStats(params),
 *   { enabled: isAuthenticated, deps: [from, to], logCategory: 'activity' },
 * );
 */
interface UseFetchOptions<T> {
  /** When false the fetcher is not called and data resets to `initialData`. Default true. */
  enabled?: boolean;
  /** Re-run the fetcher whenever any of these values change. */
  deps?: DependencyList;
  /** Value held before the first successful load. Default null. */
  initialData?: T | null;
  /** Logger category used when a request fails. Default 'api'. */
  logCategory?: LogCategory;
  /** Fallback message when the thrown error carries none. */
  errorMessage?: string;
  /** Optional extra handling when a request fails. */
  onError?: (err: unknown) => void;
}

interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: Dispatch<SetStateAction<T | null>>;
}

export function useFetch<T>(
  fetcher: () => Promise<T>,
  options: UseFetchOptions<T> = {},
): UseFetchResult<T> {
  const {
    enabled = true,
    deps = [],
    initialData = null,
    logCategory = 'api',
    errorMessage = 'Failed to load data',
    onError,
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  // Latest values kept in refs so the run callback stays stable even when
  // callers pass inline closures / fresh option objects each render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const initialDataRef = useRef(initialData);
  initialDataRef.current = initialData;

  // Monotonic request id — only the newest request may commit state.
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    if (!enabled) {
      setData(initialDataRef.current);
      setError(null);
      setIsLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcherRef.current();
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      setData(result);
    } catch (err) {
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      logger.error(logCategory, 'useFetch request failed', { error: err });
      setError(err instanceof Error ? err.message || errorMessage : errorMessage);
      onErrorRef.current?.(err);
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, logCategory, errorMessage]);

  useEffect(() => {
    run();
    // Re-run when `enabled` flips or any caller-supplied dep changes. `deps` is a
    // dynamic list so exhaustive-deps cannot verify it statically.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  return { data, isLoading, error, refetch: run, setData };
}
