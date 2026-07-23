import { useCallback, useEffect, useState } from 'react';

import { api } from '../services/api';
import { logger } from '../services/logger';
import type { LiveBroadcast, LiveBroadcastListParams } from '../types/api';

interface Options extends LiveBroadcastListParams {
  /** Set false to skip fetching entirely (e.g. logged out). */
  enabled?: boolean;
  /** Re-fetch on this cadence; omit for a one-shot load. */
  refreshIntervalMs?: number;
}

interface Result {
  broadcasts: LiveBroadcast[];
  /** Server-side total, not `broadcasts.length` — the list is paginated at 20. */
  total: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Broadcasts the user may watch.
 *
 * Pass `user_id` for "is this athlete live right now?" instead of filtering the
 * global list client-side: the global list is paginated at 20, so an athlete
 * past the first page would silently look offline.
 */
export function useLiveBroadcasts({
  enabled = true,
  refreshIntervalMs,
  ...params
}: Options = {}): Result {
  const [broadcasts, setBroadcasts] = useState<LiveBroadcast[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { user_id: userId, event_id: eventId, page, per_page: perPage } = params;

  const load = useCallback(
    async (isRefresh = false) => {
      if (!enabled) return;
      if (isRefresh) setIsRefreshing(true);
      try {
        const response = await api.getLiveBroadcasts({
          user_id: userId,
          event_id: eventId,
          page,
          per_page: perPage,
        });
        setBroadcasts(response.data ?? []);
        setTotal(response.meta?.total ?? response.data?.length ?? 0);
        setError(null);
      } catch (err: any) {
        logger.warn('live', 'Failed to load live broadcasts', { error: err?.message });
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [enabled, userId, eventId, page, perPage],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!enabled || !refreshIntervalMs) return;
    const timer = setInterval(() => load(), refreshIntervalMs);
    return () => clearInterval(timer);
  }, [enabled, refreshIntervalMs, load]);

  const refresh = useCallback(() => load(true), [load]);

  return { broadcasts, total, isLoading, isRefreshing, error, refresh };
}
