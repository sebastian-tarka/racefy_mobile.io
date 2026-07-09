/**
 * Idempotent GPS point uploader — the single upload path for both the
 * foreground 30s sync tick and the background task's sync timer.
 *
 * Drains `synced = 0` rows from the SQLite point log (trackingDb) in seq order,
 * batches of 200, and marks rows synced ONLY after the server acknowledges the
 * batch. Rows are never deleted here — cleanup happens after the activity is
 * confirmed finished (session purge). Each batch carries `client_activity_id`
 * + per-point `seq`, so the server upserts on (gps_track_id, client_seq) and a
 * retried batch (timeout, lost response) is harmless.
 *
 * Failure handling: exponential backoff min(30s·2^n, 5min) persisted in the
 * tracking DB kv table (survives JS context restarts); a 401 stops retries
 * until the foreground refreshes the token; a 422 (activity no longer active,
 * outside the server's grace window) marks the batch synced so the client
 * stops retrying — the points stay in SQLite until the retention purge.
 *
 * Plain module (no React) so the headless background task can use it.
 */

import { API_BASE_URL } from '../config/api';
import { appendXdebugTrigger } from './api';
import { getAuthToken } from './backgroundApiClient';
import * as trackingDb from './trackingDb';
import { logger } from './logger';
import { getCurrentLanguage } from '../i18n';
import type { GpsPoint } from '../types/api';

const BATCH_SIZE = 200;
const DEFAULT_MAX_BATCHES = 5;
const REQUEST_TIMEOUT_MS = 30_000;
const BACKOFF_BASE_MS = 30_000;
const BACKOFF_MAX_MS = 300_000;

const KV_FAILURES = 'uploader:consecutiveFailures';
const KV_LAST_ATTEMPT = 'uploader:lastAttemptAt';

export interface UploaderServerStats {
  total_points: number;
  distance?: number;
  avg_speed?: number | null;
  max_speed?: number | null;
}

export interface DrainResult {
  uploaded: number;
  remaining: number;
  error?: string;
  backedOff?: boolean;
  /** Stats from the last successful batch response (points_count, avg/max speed) */
  lastServerStats?: UploaderServerStats;
}

// Prevents overlapping drains within one JS runtime (fg tick vs bg timer).
let isDraining = false;

/** Map stored SQLite points to the API GpsPoint payload shape. */
export function toGpsPoints(points: trackingDb.StoredTrackPoint[]): GpsPoint[] {
  return points.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    ele: p.ele,
    time: p.ts,
    speed: p.speed,
    accuracy: p.accuracy,
    hr: p.hr,
    seq: p.seq,
    segment_break: p.segmentBreak || undefined,
  }));
}

function getBackoffState(): { failures: number; lastAttemptAt: number } {
  const failures = parseInt(trackingDb.getKv(KV_FAILURES) ?? '0', 10) || 0;
  const lastAttemptAt = parseInt(trackingDb.getKv(KV_LAST_ATTEMPT) ?? '0', 10) || 0;
  return { failures, lastAttemptAt };
}

function recordFailure(): void {
  const { failures } = getBackoffState();
  trackingDb.setKv(KV_FAILURES, String(failures + 1));
  trackingDb.setKv(KV_LAST_ATTEMPT, String(Date.now()));
}

export function resetUploaderBackoff(): void {
  trackingDb.deleteKv(KV_FAILURES);
  trackingDb.deleteKv(KV_LAST_ATTEMPT);
}

function isInBackoffWindow(): boolean {
  const { failures, lastAttemptAt } = getBackoffState();
  if (failures === 0) return false;

  const delay = Math.min(BACKOFF_BASE_MS * Math.pow(2, failures - 1), BACKOFF_MAX_MS);
  return Date.now() - lastAttemptAt < delay;
}

async function postBatch(
  serverActivityId: number,
  clientActivityId: string,
  batch: trackingDb.StoredTrackPoint[],
  stats?: { calories?: number; clientDistance?: number },
): Promise<{ ok: boolean; status: number; message?: string; serverStats?: UploaderServerStats }> {
  const token = await getAuthToken();
  if (!token) {
    return { ok: false, status: 0, message: 'No auth token' };
  }

  const url = appendXdebugTrigger(`${API_BASE_URL}/activities/${serverActivityId}/points`);

  // client_distance: prefer the cumulative distance snapshot stored with the
  // point (fg points); fall back to the caller-provided live value.
  const lastCumDist = [...batch].reverse().find((p) => p.cumDist != null)?.cumDist;
  const clientDistance = lastCumDist != null ? Math.round(lastCumDist) : stats?.clientDistance;

  const body: Record<string, unknown> = {
    points: toGpsPoints(batch),
    client_activity_id: clientActivityId,
    seq_from: batch[0].seq,
    seq_to: batch[batch.length - 1].seq,
  };
  if (stats?.calories != null) body.calories = stats.calories;
  if (clientDistance != null) body.client_distance = clientDistance;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Accept-Language': getCurrentLanguage(),
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { ok: false, status: response.status, message: data.message };
    }

    return {
      ok: true,
      status: response.status,
      serverStats: {
        total_points: data.total_points ?? 0,
        distance: data.stats?.distance,
        avg_speed: data.stats?.avg_speed,
        max_speed: data.stats?.max_speed,
      },
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      message: error?.name === 'AbortError' ? 'Request timeout' : error?.message || 'Network error',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Upload pending points of the active tracking session.
 * Safe to call from any context and on any cadence — it no-ops when there is
 * nothing to do, another drain is running, or a backoff window is active.
 */
export async function drainPoints(opts?: {
  maxBatches?: number;
  stats?: { calories?: number; clientDistance?: number };
}): Promise<DrainResult> {
  const session = trackingDb.getActiveSession();

  if (!session || session.serverActivityId == null) {
    return { uploaded: 0, remaining: 0 };
  }

  const clientId = session.clientActivityId;

  if (isDraining) {
    return { uploaded: 0, remaining: trackingDb.countUnsynced(clientId), backedOff: true };
  }

  if (isInBackoffWindow()) {
    return { uploaded: 0, remaining: trackingDb.countUnsynced(clientId), backedOff: true };
  }

  isDraining = true;
  let uploaded = 0;
  let lastServerStats: UploaderServerStats | undefined;

  try {
    const maxBatches = opts?.maxBatches ?? DEFAULT_MAX_BATCHES;

    for (let i = 0; i < maxBatches; i++) {
      const batch = trackingDb.getUnsyncedPoints(clientId, BATCH_SIZE);
      if (batch.length === 0) break;

      const result = await postBatch(session.serverActivityId, clientId, batch, opts?.stats);

      if (result.ok) {
        trackingDb.markSynced(clientId, batch[0].seq, batch[batch.length - 1].seq);
        uploaded += batch.length;
        lastServerStats = result.serverStats;
        resetUploaderBackoff();
        continue;
      }

      if (result.status === 422) {
        // Server permanently refuses (activity completed, outside grace window).
        // Mark synced so we stop retrying — points remain in SQLite until purge.
        trackingDb.markSynced(clientId, batch[0].seq, batch[batch.length - 1].seq);
        logger.warn('gps', 'Uploader: batch refused by server (422) — dropped from queue', {
          seqFrom: batch[0].seq,
          seqTo: batch[batch.length - 1].seq,
          message: result.message,
        });
        continue;
      }

      // 401: stop retrying until the foreground refreshes the token.
      // Other failures (429/5xx/network/timeout): exponential backoff.
      recordFailure();
      logger.warn('gps', 'Uploader: batch failed, backing off', {
        status: result.status,
        message: result.message,
        seqFrom: batch[0].seq,
        seqTo: batch[batch.length - 1].seq,
      });

      return {
        uploaded,
        remaining: trackingDb.countUnsynced(clientId),
        error: result.message ?? `HTTP ${result.status}`,
        lastServerStats,
      };
    }

    return { uploaded, remaining: trackingDb.countUnsynced(clientId), lastServerStats };
  } finally {
    isDraining = false;
  }
}
