import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, AppStateStatus, DeviceEventEmitter} from 'react-native';
import {api} from '../services/api';
import {logger} from '../services/logger';
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

export type RetryOutcome =
  | { ok: true }
  | { ok: false; error: string };

export function useUnsyncedActivities() {
  const [items, setItems] = useState<UnsyncedActivityMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const isMounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const list = await listUnsyncedActivities();
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
    const queueSub = DeviceEventEmitter.addListener(
      UNSYNCED_QUEUE_CHANGED_EVENT,
      refresh,
    );
    return () => {
      isMounted.current = false;
      appSub.remove();
      queueSub.remove();
    };
  }, [refresh]);

  const retry = useCallback(async (activityId: number): Promise<RetryOutcome> => {
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
          ended_at: entry.endedAt,
          location: entry.location,
          client_distance: entry.distance,
          avg_heart_rate: entry.avgHeartRate,
          max_heart_rate: entry.maxHeartRate,
          calories: entry.calories,
        });
      } catch (finishErr: any) {
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
  }, [refresh]);

  const discard = useCallback(async (activityId: number) => {
    await removeUnsyncedActivity(activityId);
    await refresh();
  }, [refresh]);

  const clearAll = useCallback(async () => {
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
    discard,
    clearAll,
  };
}

// Lightweight count-only hook for the home banner.
export function useUnsyncedActivitiesCount(): { count: number; refresh: () => void } {
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => {
    countUnsyncedActivities().then(setCount).catch(() => setCount(0));
  }, []);

  useEffect(() => {
    refresh();
    const appSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') refresh();
    });
    const queueSub = DeviceEventEmitter.addListener(
      UNSYNCED_QUEUE_CHANGED_EVENT,
      refresh,
    );
    return () => {
      appSub.remove();
      queueSub.remove();
    };
  }, [refresh]);

  return { count, refresh };
}

export { enqueueUnsyncedActivity };