import { useMemo } from 'react';

import { useFetch } from './useFetch';
import { api } from '../services/api';
import type { Activity, LiveMessage } from '../types/api';

interface Result {
  /** Chronological, oldest first — the order they arrived during the run. */
  messages: LiveMessage[];
  publicCount: number;
  privateCount: number;
  isLoading: boolean;
  error: string | null;
  retry: () => Promise<void>;
  /** False when this activity can have no archive at all — render nothing. */
  isAvailable: boolean;
}

/** The server's page size for `GET /live/{id}/messages`. */
const PAGE_SIZE = 50;
/** Stop after this many messages — a runaway loop is worse than a truncated card. */
const MAX_MESSAGES = 500;

/**
 * Walks the whole archive instead of showing the first page.
 *
 * The endpoint answers 50 at a time and takes `after` (last seen id) for the
 * next slice. A busy broadcast passes 50 easily, and a card that silently stops
 * there would also print a message count that is simply wrong.
 */
async function fetchAllMessages(activityId: number): Promise<LiveMessage[]> {
  const all: LiveMessage[] = [];
  let after: number | undefined;

  while (all.length < MAX_MESSAGES) {
    const page = await api.getLiveMessages(activityId, after);
    if (page.length === 0) break;

    all.push(...page);
    // A short page is the last one; asking again would only repeat the request.
    if (page.length < PAGE_SIZE) break;

    after = Math.max(...page.map((m) => m.id));
  }

  return all;
}

/**
 * The messages a spectator sent while the athlete was broadcasting, read back
 * after the activity is over.
 *
 * They survive the broadcast: `GET /live/{id}/messages` authorises the owner
 * regardless of `is_live`, so the same endpoint the recording screen polls also
 * answers weeks later. Only the owner, though — for everyone else a finished
 * broadcast is a 404, which is why this never runs for someone else's activity.
 *
 * Gated on `live_started_at` rather than `is_live`: `is_live` is cleared when
 * the broadcast ends, while the start timestamp is only ever set, never reset.
 * It is the one field that still says "this activity was broadcast" afterwards,
 * and it keeps the app from firing a request for every activity ever opened.
 */
export function useLiveMessageArchive(activity: Activity | null): Result {
  const activityId = activity?.id ?? null;
  const isAvailable = !!activityId && !!activity?.is_owner && !!activity?.live_started_at;

  const { data, isLoading, error, refetch } = useFetch<LiveMessage[]>(
    () => fetchAllMessages(activityId as number),
    {
      enabled: isAvailable,
      deps: [activityId],
      initialData: [],
      logCategory: 'api',
    },
  );

  const messages = useMemo(() => data ?? [], [data]);

  const publicCount = useMemo(
    () => messages.filter((m) => m.live_visibility === 'public').length,
    [messages],
  );

  return {
    messages,
    publicCount,
    privateCount: messages.length - publicCount,
    isLoading,
    error,
    retry: refetch,
    isAvailable,
  };
}
