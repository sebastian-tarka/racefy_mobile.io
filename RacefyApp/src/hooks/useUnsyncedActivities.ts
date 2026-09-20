import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, DeviceEventEmitter } from 'react-native';
import { api } from '../services/api';
import { logger } from '../services/logger';
import {
  clearAllUnsyncedActivities,
  countUnsyncedActivities,
  enqueueUnsyncedActivity,
  getUnsyncedActivity,
  listUnsyncedActivities,
  removeUnsyncedActivity,
  UNSYNCED_QUEUE_CHANGED_EVENT,
  type UnsyncedActivityMeta,
  updateUnsyncedActivityMeta,
} from '../services/unsyncedActivities';
import * as trackingDb from '../services/trackingDb';
import type { PendingFinish, PendingFinishState } from '../services/trackingDb';
import {
  FINISH_QUEUE_CHANGED_EVENT,
  syncPendingFinishes,
  type FinishOutcome,
} from '../services/finishSync';

export type RetryOutcome = { ok: true } | { ok: false; error: string };

/**
 * One row of the "not sent yet" screen. Two sources feed it:
 *  - the SQLite finish outbox (`source: 'outbox'`) — every activity saved since
 *    offline saving exists; retried automatically by services/finishSync;
 *  - the legacy AsyncStorage queue (`source: 'legacy'`) — older entries whose
 *    recording session is gone, so they could not be migrated; manual retry only.
 */
export type UnsyncedItem = UnsyncedActivityMeta & {
  source: 'outbox' | 'legacy';
  /** Outbox only. `pending` = waits for a network, `needs_attention` = the server refused it. */
  state?: PendingFinishState;
  clientActivityId?: string;
  /** Outbox only: the activity is linked to an event (so "send without event" makes sense). */
  hasEvent?: boolean;
};

function outboxToItem(entry: PendingFinish): UnsyncedItem {
  const meta = entry.meta as Record<string, any>;
  return {
    source: 'outbox',
    state: entry.state,
    clientActivityId: entry.clientActivityId,
    hasEvent: (entry.payload as Record<string, any>).event_id != null,
    activityId: entry.serverActivityId,
    sportTypeId: meta.sportTypeId ?? 0,
    sportTypeName: meta.sportTypeName,
    title: meta.title,
    startedAt: meta.startedAt ?? entry.createdAt,
    endedAt: meta.endedAt ?? entry.createdAt,
    distance: meta.distance ?? 0,
    duration: meta.duration ?? 0,
    elevationGain: 0,
    calories: 0,
    pointsCount: trackingDb.countUnsynced(entry.clientActivityId),
    lastError: entry.lastError ?? undefined,
    failedAt: entry.createdAt,
    retryCount: entry.attempts,
  };
}

function outcomeToRetry(outcome: FinishOutcome | undefined): RetryOutcome {
  if (!outcome) return { ok: false, error: 'Entry not found' };
  switch (outcome.status) {
    case 'delivered':
      return { ok: true };
    case 'retry_later':
    case 'needs_attention':
      return { ok: false, error: outcome.error };
    case 'auth_required':
      return { ok: false, error: 'Unauthenticated' };
    default:
      return { ok: false, error: outcome.reason };
  }
}

export function useUnsyncedActivities() {
  const [items, setItems] = useState<UnsyncedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const isMounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const legacy = await listUnsyncedActivities();
      const outbox = trackingDb.listPendingFinishes().map(outboxToItem);
      const list: UnsyncedItem[] = [
        ...outbox,
        ...legacy.map((e) => ({ ...e, source: 'legacy' as const })),
      ].sort((a, b) => new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime());
      if (isMounted.current) setItems(list);
    } catch (err) {
      logger.warn('activity', 'Failed to list unsynced activities', { error: err });
      if (isMounted.current) setItems([]);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    refresh();
    const appSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') refresh();
    });
    const queueSub = DeviceEventEmitter.addListener(UNSYNCED_QUEUE_CHANGED_EVENT, refresh);
    const outboxSub = DeviceEventEmitter.addListener(FINISH_QUEUE_CHANGED_EVENT, refresh);
    return () => {
      isMounted.current = false;
      appSub.remove();
      queueSub.remove();
      outboxSub.remove();
    };
  }, [refresh]);

  /** Send one outbox entry now, ignoring backoff and `needs_attention` parking. */
  const sendOutboxEntry = useCallback(
    async (activityId: number, clientActivityId: string): Promise<RetryOutcome> => {
      setRetryingId(activityId);
      try {
        const outcomes = await syncPendingFinishes({ force: true, only: clientActivityId });
        await refresh();
        return outcomeToRetry(outcomes[clientActivityId]);
      } finally {
        if (isMounted.current) setRetryingId(null);
      }
    },
    [refresh],
  );

  /** The server refused the event link (closed, not registered…): send the activity on its own. */
  const retryWithoutEvent = useCallback(
    async (item: UnsyncedItem): Promise<RetryOutcome> => {
      if (item.source !== 'outbox' || !item.clientActivityId) {
        return { ok: false, error: 'Entry not found' };
      }
      const entry = trackingDb.getPendingFinish(item.clientActivityId);
      if (!entry) return { ok: false, error: 'Entry not found' };
      trackingDb.updatePendingFinish(item.clientActivityId, {
        payload: { ...entry.payload, event_id: null },
      });
      return sendOutboxEntry(item.activityId, item.clientActivityId);
    },
    [sendOutboxEntry],
  );

  const retry = useCallback(
    async (activityId: number): Promise<RetryOutcome> => {
      const owed = trackingDb.getPendingFinishByServerActivityId(activityId);
      if (owed) return sendOutboxEntry(activityId, owed.clientActivityId);

      setRetryingId(activityId);
      try {
        const entry = await getUnsyncedActivity(activityId);
        if (!entry) {
          return { ok: false, error: 'Entry not found' };
        }

        // 1. Upload points in one batch (the server already handled smaller
        //    batches; if this is too large we'll learn from the response).
        if (entry.points.length > 0) {
          try {
            await api.addActivityPoints(activityId, entry.points, {
              calories: entry.calories,
              avg_heart_rate: entry.avgHeartRate,
              max_heart_rate: entry.maxHeartRate,
              client_distance: entry.distance,
            });
          } catch (pointsErr: any) {
            const msg = pointsErr?.message || 'Failed to upload points';
            await updateUnsyncedActivityMeta(activityId, {
              lastError: msg,
              lastRetryAt: new Date().toISOString(),
              retryCount: (entry.retryCount || 0) + 1,
            });
            await refresh();
            return { ok: false, error: msg };
          }
        }

        // 2. Finish the activity (no final_points: they were uploaded above).
        try {
          await api.finishActivity(activityId, {
            title: entry.title,
            description: entry.description,
            skip_auto_post: entry.skipAutoPost,
            event_id: entry.eventId,
            client_activity_id: entry.clientActivityId,
            total_paused_duration: entry.totalPausedDuration,
            ended_at: entry.endedAt,
            location: entry.location,
            client_distance: entry.distance,
            avg_heart_rate: entry.avgHeartRate,
            max_heart_rate: entry.maxHeartRate,
            calories: entry.calories,
          });
        } catch (finishErr: any) {
          // A 422 here usually means the FIRST finish did land and only its
          // response was lost. If the server says the activity is completed,
          // that is success, not an error to show the athlete forever.
          if (finishErr?.status === 422) {
            const landed = await api
              .getActivity(activityId)
              .then((a) => a.status === 'completed')
              .catch(() => false);
            if (landed) {
              await removeUnsyncedActivity(activityId);
              await refresh();
              logger.activity('Unsynced activity was already finished on the server', {
                activityId,
              });
              return { ok: true };
            }
          }
          const msg = finishErr?.message || 'Failed to finish activity';
          await updateUnsyncedActivityMeta(activityId, {
            lastError: msg,
            lastRetryAt: new Date().toISOString(),
            retryCount: (entry.retryCount || 0) + 1,
          });
          await refresh();
          return { ok: false, error: msg };
        }

        // Both steps succeeded — drop the entry.
        await removeUnsyncedActivity(activityId);
        await refresh();
        logger.activity('Unsynced activity retried successfully', { activityId });
        return { ok: true };
      } finally {
        if (isMounted.current) setRetryingId(null);
      }
    },
    [refresh],
  );

  const discard = useCallback(
    async (activityId: number) => {
      const owed = trackingDb.getPendingFinishByServerActivityId(activityId);
      if (owed) {
        // The server still holds the activity open; without this it would block
        // the next start ("an activity is already in progress"). Best effort —
        // offline it stays open server-side and surfaces as a recoverable
        // activity on the next launch, where it can be discarded again.
        await api.discardActivity(activityId).catch(() => {});
        trackingDb.discardPendingFinish(owed.clientActivityId);
        DeviceEventEmitter.emit(FINISH_QUEUE_CHANGED_EVENT);
      } else {
        await removeUnsyncedActivity(activityId);
      }
      await refresh();
    },
    [refresh],
  );

  const clearAll = useCallback(async () => {
    for (const entry of trackingDb.listPendingFinishes()) {
      trackingDb.discardPendingFinish(entry.clientActivityId);
    }
    await clearAllUnsyncedActivities();
    await refresh();
  }, [refresh]);

  return {
    items,
    count: items.length,
    isLoading,
    retryingId,
    refresh,
    retry,
    retryWithoutEvent,
    discard,
    clearAll,
  };
}

// Lightweight count-only hook for the home banner.
export function useUnsyncedActivitiesCount(): { count: number; refresh: () => void } {
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => {
    countUnsyncedActivities()
      .then((legacy) => setCount(legacy + trackingDb.countPendingFinishes()))
      .catch(() => setCount(trackingDb.countPendingFinishes()));
  }, []);

  useEffect(() => {
    refresh();
    const appSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') refresh();
    });
    const queueSub = DeviceEventEmitter.addListener(UNSYNCED_QUEUE_CHANGED_EVENT, refresh);
    const outboxSub = DeviceEventEmitter.addListener(FINISH_QUEUE_CHANGED_EVENT, refresh);
    return () => {
      appSub.remove();
      queueSub.remove();
      outboxSub.remove();
    };
  }, [refresh]);

  return { count, refresh };
}

export { enqueueUnsyncedActivity };
