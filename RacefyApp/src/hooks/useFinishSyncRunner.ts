import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, DeviceEventEmitter } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { api } from '../services/api';
import { logger } from '../services/logger';
import * as trackingDb from '../services/trackingDb';
import { drainPoints, resetUploaderBackoff } from '../services/pointsUploader';
import {
  configureFinishSync,
  emitFinishSyncEvent,
  FINISH_DELIVERED_EVENT,
  syncPendingFinishes,
  type FinishDelivered,
} from '../services/finishSync';
import { notifyActivityDelivered } from '../services/finishSyncNotification';
import {
  ensureFinishSyncTaskRegistered,
  KV_AUTH_USER_ID,
  unregisterFinishSyncTask,
} from '../services/finishSyncBackgroundTask';
import { migrateLegacyUnsyncedQueue } from '../services/unsyncedActivities';
import { emitRefresh } from '../services/refreshEvents';

/**
 * Finishes delivered while the athlete is still on the save screen are announced
 * there; the runner stays quiet about them. The save flow registers the id here
 * for the few seconds it waits.
 */
const announcedElsewhere = new Set<string>();
export function suppressDeliveredNotification(clientActivityId: string): () => void {
  announcedElsewhere.add(clientActivityId);
  return () => announcedElsewhere.delete(clientActivityId);
}

/**
 * Owns WHEN queued finishes are sent. Mounted once (LiveActivityProvider).
 *
 * Triggers, in order of how much they are trusted:
 *  - network regained → forced (backoff from the dead period says nothing about now);
 *  - sign-in → forced (a 401 is the only reason a run stops early);
 *  - app start and return to foreground → timed (respects per-entry backoff);
 *  - a fresh save triggers its own sync from the save flow.
 * With the app closed, services/finishSyncBackgroundTask takes over; this hook
 * keeps that task registered exactly as long as there is something to deliver.
 */
export function useFinishSyncRunner(userId: number | null, isAuthenticated: boolean) {
  const userIdRef = useRef<number | null>(userId);
  userIdRef.current = userId;

  // Wire the engine once.
  useEffect(() => {
    configureFinishSync({
      db: trackingDb,
      drain: drainPoints,
      // The start body is stored verbatim at record time; the API method's typed
      // signature is for callers that build one by hand.
      start: (payload) =>
        api.startLiveActivity(payload as Parameters<typeof api.startLiveActivity>[0]),
      finish: (activityId, payload) => api.finishActivity(activityId, payload),
      getActivity: (activityId) => api.getActivity(activityId),
      currentUserId: () => userIdRef.current,
      now: Date.now,
      random: Math.random,
      emit: emitFinishSyncEvent,
    });
    // Entries left `syncing` by a kill mid-request would otherwise never be picked up again.
    trackingDb.resetInterruptedFinishes();
    // Something left over from a previous run: make sure the OS will wake us for it.
    if (trackingDb.countPendingFinishes() > 0) void ensureFinishSyncTaskRegistered();
  }, []);

  // The headless task has no auth context: leave it the id of whoever is signed
  // in, so it can refuse to send one account's activity from another.
  useEffect(() => {
    if (userId != null) trackingDb.setKv(KV_AUTH_USER_ID, String(userId));
    else if (!isAuthenticated) trackingDb.deleteKv(KV_AUTH_USER_ID);
  }, [userId, isAuthenticated]);

  // Announce + refresh when something lands.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(FINISH_DELIVERED_EVENT, (e: FinishDelivered) => {
      emitRefresh('activities');
      emitRefresh('feed');
      if (trackingDb.countPendingFinishes() === 0) void unregisterFinishSyncTask();
      if (announcedElsewhere.has(e.clientActivityId)) return;
      void notifyActivityDelivered({
        title: e.response?.data?.title,
        pointsEarned: e.response?.points_earned,
      });
    });
    return () => sub.remove();
  }, []);

  // Sign-in (and app start while signed in): bring the old queue over, then send.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      await migrateLegacyUnsyncedQueue(userIdRef.current);
      if (cancelled) return;
      await syncPendingFinishes({ force: true });
    })().catch((error) => logger.warn('activity', 'Finish sync on sign-in failed', { error }));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Network regained.
  useEffect(() => {
    let wasReachable: boolean | null = null;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const reachable = !!state.isConnected && state.isInternetReachable !== false;
      const regained = wasReachable === false && reachable;
      wasReachable = reachable;
      if (!regained || trackingDb.countPendingFinishes() === 0) return;
      logger.activity('Network regained — sending queued activities');
      resetUploaderBackoff();
      void syncPendingFinishes({ force: true });
    });
    return unsubscribe;
  }, []);

  // Back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && trackingDb.countPendingFinishes() > 0) {
        void syncPendingFinishes();
      }
    });
    return () => sub.remove();
  }, []);
}
