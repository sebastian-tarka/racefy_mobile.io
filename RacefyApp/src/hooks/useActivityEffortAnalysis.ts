import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { ActivityEffortAnalysis, EffortAnalysisResult } from '../types/api';

export { qualifiesForEffortAnalysis } from '../utils/effortAnalysis';

/** A ready analysis is deterministic; only HR upload or a merge changes it. */
const STALE_MS = 5 * 60 * 1000;

/**
 * Two nudges, then we stop asking. A 202 means a job was queued, not that
 * something is wrong — hammering the endpoint would only queue more work.
 * Whatever is still pending gets picked up the next time the screen is focused.
 */
const PENDING_RETRY_DELAYS_MS = [15_000, 45_000];

interface CacheEntry {
  result: EffortAnalysisResult;
  fetchedAt: number;
}

const cache = new Map<number, CacheEntry>();

/** Drop the cached analysis for an activity — call after uploading health data. */
export function invalidateEffortAnalysis(activityId: number): void {
  cache.delete(activityId);
}

export interface UseActivityEffortAnalysisResult {
  analysis: ActivityEffortAnalysis | null;
  /** True while the backend is still computing (HTTP 202). */
  isPending: boolean;
  /** True when the card must not render at all: 204, 404, error, or no data. */
  isUnavailable: boolean;
  isLoading: boolean;
}

/**
 * Fetches `/activities/{id}/analysis`, cached per activity id.
 *
 * `enabled` lets the caller skip the request entirely for activities that
 * cannot qualify (mirror of the backend rule: completed, has GPS, >= 8 min,
 * >= 1 km) — that check costs nothing and saves a round trip.
 */
export function useActivityEffortAnalysis(
  activityId: number | null | undefined,
  options: { enabled?: boolean } = {},
): UseActivityEffortAnalysisResult {
  const { enabled = true } = options;

  const cached = activityId ? cache.get(activityId) : undefined;
  const [result, setResult] = useState<EffortAnalysisResult | null>(cached?.result ?? null);
  const [isLoading, setIsLoading] = useState(false);

  // Bumped on unmount and on every activity change, so a late response from a
  // previous activity can never land in this state.
  const requestIdRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const load = useCallback(
    async (attempt: number) => {
      if (!activityId || !enabled) return;

      const requestId = requestIdRef.current;
      if (attempt === 0) setIsLoading(true);

      try {
        const next = await api.getActivityEffortAnalysis(activityId);
        if (requestId !== requestIdRef.current) return; // stale — screen moved on

        cache.set(activityId, { result: next, fetchedAt: Date.now() });
        setResult(next);

        if (next.state === 'pending' && attempt < PENDING_RETRY_DELAYS_MS.length) {
          const timer = setTimeout(() => load(attempt + 1), PENDING_RETRY_DELAYS_MS[attempt]);
          timersRef.current.push(timer);
        }
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        // A failed request is not a "never" — leave it uncached so the next
        // visit tries again, and just hide the card for now.
        logger.warn('activity', 'Effort analysis request failed', { activityId, error: err });
        setResult({ state: 'unavailable' });
      } finally {
        if (requestId === requestIdRef.current && attempt === 0) setIsLoading(false);
      }
    },
    [activityId, enabled],
  );

  useEffect(() => {
    clearTimers();
    requestIdRef.current += 1;

    if (!activityId || !enabled) {
      setResult(null);
      return;
    }

    const entry = cache.get(activityId);
    if (entry) {
      setResult(entry.result);
      // A settled verdict never changes on its own; only a pending or stale
      // one is worth another request.
      const isFresh = Date.now() - entry.fetchedAt < STALE_MS;
      if (entry.result.state !== 'pending' && isFresh) return;
    } else {
      setResult(null);
    }

    load(0);

    return clearTimers;
  }, [activityId, enabled, load, clearTimers]);

  // Coming back to the screen is the natural moment to re-check a pending job.
  useFocusEffect(
    useCallback(() => {
      if (!activityId || !enabled) return;
      if (cache.get(activityId)?.result.state === 'pending') {
        load(0);
      }
    }, [activityId, enabled, load]),
  );

  useEffect(
    () => () => {
      requestIdRef.current += 1;
      clearTimers();
    },
    [clearTimers],
  );

  return {
    analysis: result?.state === 'ready' ? result.analysis : null,
    isPending: result?.state === 'pending',
    isUnavailable: result?.state === 'unavailable',
    isLoading,
  };
}
