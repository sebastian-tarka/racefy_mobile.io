/**
 * Background delivery of activities saved offline — the "app is closed" leg.
 *
 * services/finishSync sends queued finishes whenever the app is running and a
 * network turns up. This module covers the rest: the athlete saved a run with no
 * signal, put the phone away, and walked back into coverage without ever opening
 * the app again. The OS wakes us (Android WorkManager / iOS BGTaskScheduler — only
 * with a network and enough battery, never more often than every 15 minutes, and
 * on iOS not at all once the app has been swiped away) and we drain the outbox.
 *
 * It is a convenience on top of the foreground triggers, not a replacement: the
 * OS gives no guarantee WHEN this runs, so nothing may depend on it.
 *
 * MUST be imported from the app entry (index.ts): TaskManager.defineTask has to
 * run at module scope on every JS start, including the headless one.
 */

import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { logger } from './logger';
import * as trackingDb from './trackingDb';
import { drainPoints } from './pointsUploader';
import {
  finishActivityHeadless,
  getActivityHeadless,
  startActivityHeadless,
} from './backgroundApiClient';
import {
  configureFinishSync,
  emitFinishSyncEvent,
  FINISH_DELIVERED_EVENT,
  isFinishSyncConfigured,
  syncPendingFinishes,
  type FinishDelivered,
} from './finishSync';
import { notifyActivityDelivered } from './finishSyncNotification';
import { loadSavedLanguage } from '../i18n';

export const FINISH_SYNC_TASK = 'racefy-finish-sync';

/** tracking DB kv key: id of the signed-in user, for the "never send from another account" guard. */
export const KV_AUTH_USER_ID = 'auth:userId';

/** Minutes. The platforms floor this at 15 anyway; asking for less changes nothing. */
const MINIMUM_INTERVAL_MIN = 15;

function headlessUserId(): number | null {
  const raw = trackingDb.getKv(KV_AUTH_USER_ID);
  const id = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(id) ? id : null;
}

/**
 * Wire the engine without React. Only used when nothing else has: if the app's
 * UI is alive in this runtime, useFinishSyncRunner already configured it and
 * announces deliveries itself — doing it here as well would notify twice.
 */
function configureHeadless(): void {
  configureFinishSync({
    db: trackingDb,
    drain: drainPoints,
    start: startActivityHeadless,
    finish: finishActivityHeadless,
    getActivity: getActivityHeadless,
    currentUserId: headlessUserId,
    now: Date.now,
    random: Math.random,
    emit: (event, payload) => {
      emitFinishSyncEvent(event, payload);
      if (event !== FINISH_DELIVERED_EVENT) return;
      const delivered = payload as FinishDelivered;
      void loadSavedLanguage()
        .catch(() => {})
        .then(() =>
          notifyActivityDelivered({
            title: delivered.response?.data?.title,
            pointsEarned: delivered.response?.points_earned,
          }),
        );
    },
  });
  // Nobody else is running in a headless runtime, so a `syncing` entry can only
  // be the residue of a run the OS killed.
  trackingDb.resetInterruptedFinishes();
}

/** The task body, separate from the TaskManager plumbing so it can be tested. */
export async function runBackgroundFinishSync(): Promise<BackgroundTask.BackgroundTaskResult> {
  try {
    if (trackingDb.countPendingFinishes() === 0) {
      await unregisterFinishSyncTask();
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    if (!isFinishSyncConfigured()) configureHeadless();

    // Timed, not forced: per-entry backoff and `needs_attention` parking still
    // apply — a refused activity must not be re-sent every 15 minutes forever.
    const outcomes = await syncPendingFinishes();
    logger.activity('Background finish sync ran', {
      outcomes: Object.values(outcomes).map((o) => o.status),
    });

    if (trackingDb.countPendingFinishes() === 0) await unregisterFinishSyncTask();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error: any) {
    logger.warn('activity', 'Background finish sync failed', { error: error?.message });
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask(FINISH_SYNC_TASK, () => runBackgroundFinishSync());
}

/**
 * Ask the OS to wake us while there is something to deliver. Registered only
 * then (and dropped once the outbox is empty): a periodic task with nothing to do
 * is battery spent for nothing.
 */
export async function ensureFinishSyncTaskRegistered(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(FINISH_SYNC_TASK)) return;
    await BackgroundTask.registerTaskAsync(FINISH_SYNC_TASK, {
      minimumInterval: MINIMUM_INTERVAL_MIN,
    });
    logger.activity('Background finish sync registered');
  } catch (error: any) {
    // Expo Go, simulator, restricted background refresh: foreground sync still covers it.
    logger.debug('activity', 'Could not register background finish sync', {
      error: error?.message,
    });
  }
}

export async function unregisterFinishSyncTask(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (await TaskManager.isTaskRegisteredAsync(FINISH_SYNC_TASK)) {
      await BackgroundTask.unregisterTaskAsync(FINISH_SYNC_TASK);
      logger.activity('Background finish sync unregistered (outbox empty)');
    }
  } catch (error: any) {
    logger.debug('activity', 'Could not unregister background finish sync', {
      error: error?.message,
    });
  }
}
