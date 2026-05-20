/**
 * Unsynced activities queue
 *
 * When a live activity can't be finished on the server (e.g. backend returns
 * 500 on /points + /finish and the user gives up retrying), the activity is
 * snapshot here. The queue survives logout and app restart, and exposes the
 * raw GPS points so the UI can retry the upload or export them as GPX.
 *
 * Schema in AsyncStorage:
 *   `@racefy:unsynced:index`           -> JSON array of UnsyncedActivityMeta
 *   `@racefy:unsynced:points:{id}`     -> JSON array of GpsPoint (raw, deduplicated)
 *
 * We split metadata from the (potentially large) point list so listings can be
 * read cheaply without parsing every track.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {DeviceEventEmitter} from 'react-native';
import {logger} from './logger';
import type {ActivityLocation, GpsPoint} from '../types/api';

const INDEX_KEY = '@racefy:unsynced:index';
const POINTS_KEY_PREFIX = '@racefy:unsynced:points:';

/** Event fired whenever the queue contents change. UI hooks subscribe to refresh. */
export const UNSYNCED_QUEUE_CHANGED_EVENT = 'unsyncedQueue:changed';

function emitQueueChanged(): void {
  DeviceEventEmitter.emit(UNSYNCED_QUEUE_CHANGED_EVENT);
}

export interface UnsyncedActivityMeta {
  activityId: number;
  sportTypeId: number;
  sportTypeName?: string;
  title?: string;
  startedAt: string;
  endedAt: string;
  distance: number;       // meters, client-calculated
  duration: number;       // seconds
  elevationGain: number;  // meters
  calories: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  pointsCount: number;
  location?: ActivityLocation;
  lastError?: string;     // message from the last failed attempt
  failedAt: string;       // ISO timestamp of the failure that put it here
  retryCount: number;     // number of manual retries the user attempted
  lastRetryAt?: string;   // ISO timestamp of the last manual retry
}

export interface UnsyncedActivity extends UnsyncedActivityMeta {
  points: GpsPoint[];
}

function pointsKey(activityId: number): string {
  return `${POINTS_KEY_PREFIX}${activityId}`;
}

async function readIndex(): Promise<UnsyncedActivityMeta[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logger.warn('activity', 'Failed to read unsynced queue index', { error: err });
    return [];
  }
}

async function writeIndex(index: UnsyncedActivityMeta[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

async function readPoints(activityId: number): Promise<GpsPoint[]> {
  try {
    const raw = await AsyncStorage.getItem(pointsKey(activityId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logger.warn('activity', 'Failed to read unsynced points', {
      activityId,
      error: err,
    });
    return [];
  }
}

export async function listUnsyncedActivities(): Promise<UnsyncedActivityMeta[]> {
  const index = await readIndex();
  return [...index].sort((a, b) =>
    new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime(),
  );
}

export async function countUnsyncedActivities(): Promise<number> {
  const index = await readIndex();
  return index.length;
}

export async function getUnsyncedActivity(
  activityId: number,
): Promise<UnsyncedActivity | null> {
  const index = await readIndex();
  const meta = index.find(e => e.activityId === activityId);
  if (!meta) return null;
  const points = await readPoints(activityId);
  return { ...meta, points };
}

export async function enqueueUnsyncedActivity(
  meta: Omit<UnsyncedActivityMeta, 'failedAt' | 'retryCount'> & {
    failedAt?: string;
    retryCount?: number;
  },
  points: GpsPoint[],
): Promise<void> {
  const index = await readIndex();
  const failedAt = meta.failedAt ?? new Date().toISOString();
  const existing = index.find(e => e.activityId === meta.activityId);

  const merged: UnsyncedActivityMeta = {
    ...existing,
    ...meta,
    failedAt,
    retryCount: meta.retryCount ?? existing?.retryCount ?? 0,
  };

  const nextIndex = [
    ...index.filter(e => e.activityId !== meta.activityId),
    merged,
  ];

  await AsyncStorage.setItem(pointsKey(meta.activityId), JSON.stringify(points));
  await writeIndex(nextIndex);

  logger.activity('Enqueued unsynced activity', {
    activityId: meta.activityId,
    points: points.length,
    queueSize: nextIndex.length,
  });

  emitQueueChanged();
}

export async function updateUnsyncedActivityMeta(
  activityId: number,
  patch: Partial<UnsyncedActivityMeta>,
): Promise<void> {
  const index = await readIndex();
  const idx = index.findIndex(e => e.activityId === activityId);
  if (idx === -1) return;
  index[idx] = { ...index[idx], ...patch };
  await writeIndex(index);
  emitQueueChanged();
}

export async function removeUnsyncedActivity(activityId: number): Promise<void> {
  const index = await readIndex();
  const next = index.filter(e => e.activityId !== activityId);
  await writeIndex(next);
  await AsyncStorage.removeItem(pointsKey(activityId));
  logger.activity('Removed unsynced activity', {
    activityId,
    queueSize: next.length,
  });
  emitQueueChanged();
}

export async function clearAllUnsyncedActivities(): Promise<void> {
  const index = await readIndex();
  await AsyncStorage.multiRemove([
    INDEX_KEY,
    ...index.map(e => pointsKey(e.activityId)),
  ]);
  logger.activity('Cleared unsynced activity queue', {
    cleared: index.length,
  });
  emitQueueChanged();
}