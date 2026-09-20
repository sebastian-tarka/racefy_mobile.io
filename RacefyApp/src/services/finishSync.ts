/**
 * Finish sync — delivers activities the athlete has already saved.
 *
 * Saving an activity is a LOCAL operation: the finish request is written to the
 * outbox (trackingDb.pending_finishes), the recording screen is freed, and this
 * module gets it to the server — now if there is a network, otherwise whenever
 * one comes back. It is the only thing that talks to `POST /activities/{id}/finish`
 * for recorded activities.
 *
 * Per entry: upload the track first (idempotent batches of 200 through the points
 * uploader — this is also what lifts the server's 3000-points-per-request cap for
 * a long stretch without signal), then finish with the `ended_at` of the moment
 * the athlete stopped, not of the moment of delivery.
 *
 * Failures are sorted into three kinds, because they need opposite handling:
 *  - transient (no answer, 5xx, 429): retry later, exponential backoff with full
 *    jitter, per entry — one stuck activity never holds up the others;
 *  - auth (401): nothing here can fix it; stop the run and wait for a sign-in;
 *  - verdict (other 4xx): retrying the same request fails the same way forever.
 *    The entry is parked as `needs_attention` for the athlete to decide — after
 *    checking it is not simply a finish that already landed (lost response).
 *
 * Plain module (no React) with injectable dependencies: testable without a
 * device, and usable from a headless background task later.
 */

import { DeviceEventEmitter } from 'react-native';
import { logger } from './logger';
import * as trackingDb from './trackingDb';
import type { PendingFinish } from './trackingDb';
import { drainPoints, toGpsPoints } from './pointsUploader';
import type { Activity, FinishActivityRequest, FinishActivityResponse } from '../types/api';

/** Queue contents or an entry's state changed — list/count hooks refresh on it. */
export const FINISH_QUEUE_CHANGED_EVENT = 'finishSync:changed';
/** An entry reached the server. Payload: `FinishDelivered`. */
export const FINISH_DELIVERED_EVENT = 'finishSync:delivered';

export interface FinishDelivered {
  clientActivityId: string;
  activityId: number;
  /** Absent when we only learned the finish had landed earlier (lost response). */
  response?: FinishActivityResponse;
}

export type FinishOutcome =
  | { status: 'delivered'; response?: FinishActivityResponse }
  | { status: 'retry_later'; error: string }
  | { status: 'auth_required' }
  | { status: 'needs_attention'; error: string }
  | { status: 'skipped'; reason: 'other_user' | 'not_due' | 'parked' };

export interface FinishSyncDeps {
  db: Pick<
    typeof trackingDb,
    | 'listPendingFinishes'
    | 'updatePendingFinish'
    | 'completePendingFinish'
    | 'getUnsyncedPoints'
    | 'countUnsynced'
  >;
  drain: typeof drainPoints;
  finish: (activityId: number, payload: FinishActivityRequest) => Promise<FinishActivityResponse>;
  getActivity: (activityId: number) => Promise<Activity>;
  currentUserId: () => number | null;
  now: () => number;
  random: () => number;
  emit: (event: string, payload?: unknown) => void;
}

const BACKOFF_BASE_MS = 15_000;
const BACKOFF_CAP_MS = 15 * 60_000;
/** The server caps `final_points` at 3000; anything the uploader could not move stays below it or waits. */
const FINAL_POINTS_CAP = 3000;
const DRAIN_BATCHES_PER_PASS = 25;
/** 25 batches × 200 points × 40 passes = 200k points — more than a day of recording at 1 Hz. */
const MAX_DRAIN_PASSES = 40;

/** Full jitter: anywhere between 0 and the exponential ceiling, so a crowd coming back online does not knock in step. */
export function backoffDelay(attempts: number, random: () => number): number {
  const ceiling = Math.min(
    BACKOFF_CAP_MS,
    BACKOFF_BASE_MS * Math.pow(2, Math.max(0, attempts - 1)),
  );
  return Math.round(random() * ceiling);
}

function isTransient(status: number | undefined): boolean {
  return status == null || status >= 500 || status === 429;
}

let deps: FinishSyncDeps | null = null;

/** Wire the real dependencies once at app start (or fakes in tests). */
export function configureFinishSync(next: FinishSyncDeps): void {
  deps = next;
}

/**
 * Has anyone wired the engine in this JS runtime? The background task asks: if
 * the app's UI is alive it has (and owns announcements); a cold headless launch
 * has not, and the task wires its own, React-free dependencies.
 */
export function isFinishSyncConfigured(): boolean {
  return deps !== null;
}

// One run at a time, in call order: a regained network, a foreground event and a
// fresh save often fire within the same second.
let chain: Promise<unknown> = Promise.resolve();

export interface SyncOptions {
  /** Ignore backoff and `needs_attention` parking — the athlete (or a regained network) asked. */
  force?: boolean;
  /** Only this entry. */
  only?: string;
}

export function syncPendingFinishes(
  opts: SyncOptions = {},
): Promise<Record<string, FinishOutcome>> {
  const run = chain.then(() => runSync(opts));
  chain = run.catch(() => {});
  return run;
}

async function runSync(opts: SyncOptions): Promise<Record<string, FinishOutcome>> {
  const d = deps;
  const outcomes: Record<string, FinishOutcome> = {};
  if (!d) return outcomes;

  const entries = d.db
    .listPendingFinishes()
    .filter((e) => !opts.only || e.clientActivityId === opts.only);

  for (const entry of entries) {
    const outcome = await processEntry(d, entry, !!opts.force);
    outcomes[entry.clientActivityId] = outcome;
    if (outcome.status !== 'skipped') d.emit(FINISH_QUEUE_CHANGED_EVENT);
    // Without a valid token every further request fails the same way.
    if (outcome.status === 'auth_required') break;
  }

  return outcomes;
}

async function processEntry(
  d: FinishSyncDeps,
  entry: PendingFinish,
  force: boolean,
): Promise<FinishOutcome> {
  const userId = d.currentUserId();
  if (entry.userId != null && userId != null && entry.userId !== userId) {
    return { status: 'skipped', reason: 'other_user' };
  }
  if (!force && entry.state === 'needs_attention') return { status: 'skipped', reason: 'parked' };
  if (!force && d.now() < entry.nextAttemptAt) return { status: 'skipped', reason: 'not_due' };

  const id = entry.clientActivityId;
  d.db.updatePendingFinish(id, { state: 'syncing' });

  const retryLater = (error: string): FinishOutcome => {
    const attempts = entry.attempts + 1;
    d.db.updatePendingFinish(id, {
      state: 'pending',
      attempts,
      nextAttemptAt: d.now() + backoffDelay(attempts, d.random),
      lastError: error,
    });
    return { status: 'retry_later', error };
  };

  // 1. The track. Batches are idempotent (client_activity_id + seq), so a pass
  //    that dies halfway costs nothing but the retry.
  const session = { clientActivityId: id, serverActivityId: entry.serverActivityId };
  for (let pass = 0; pass < MAX_DRAIN_PASSES; pass++) {
    const result = await d.drain({
      session,
      maxBatches: DRAIN_BATCHES_PER_PASS,
      ignoreBackoff: true,
    });
    if (result.error) return retryLater(result.error);
    if (result.remaining === 0) break;
    // Another drain holds the uploader (live recording tick): try again later
    // rather than spin here.
    if (result.uploaded === 0) {
      if (result.remaining > FINAL_POINTS_CAP) return retryLater('Points upload busy');
      break;
    }
  }

  // 2. The finish. Whatever is still unsynced (normally nothing) rides along.
  const leftovers = d.db.getUnsyncedPoints(id, FINAL_POINTS_CAP);
  const payload: FinishActivityRequest = {
    ...(entry.payload as FinishActivityRequest),
    client_activity_id: id,
    final_points: leftovers.length > 0 ? toGpsPoints(leftovers) : undefined,
  };

  try {
    const response = await d.finish(entry.serverActivityId, payload);
    d.db.completePendingFinish(id);
    logger.activity('Queued finish delivered', {
      activityId: entry.serverActivityId,
      attempts: entry.attempts + 1,
    });
    d.emit(FINISH_DELIVERED_EVENT, {
      clientActivityId: id,
      activityId: entry.serverActivityId,
      response,
    } satisfies FinishDelivered);
    return { status: 'delivered', response };
  } catch (error: any) {
    const status: number | undefined = error?.status;
    const message: string = error?.message || 'Failed to finish activity';

    if (status === 401) {
      d.db.updatePendingFinish(id, { state: 'pending', lastError: message });
      return { status: 'auth_required' };
    }

    if (isTransient(status)) return retryLater(message);

    // A verdict. Most often a 422 "not active" for a finish that DID land and
    // whose response we never saw — ask the server before bothering the athlete.
    const landed = await d
      .getActivity(entry.serverActivityId)
      .then((a) => a.status === 'completed')
      .catch(() => false);

    if (landed) {
      d.db.completePendingFinish(id);
      logger.activity('Queued finish had already landed', { activityId: entry.serverActivityId });
      d.emit(FINISH_DELIVERED_EVENT, {
        clientActivityId: id,
        activityId: entry.serverActivityId,
      } satisfies FinishDelivered);
      return { status: 'delivered' };
    }

    d.db.updatePendingFinish(id, {
      state: 'needs_attention',
      attempts: entry.attempts + 1,
      lastError: message,
    });
    logger.warn('activity', 'Queued finish refused by server — needs attention', {
      activityId: entry.serverActivityId,
      status,
      message,
    });
    return { status: 'needs_attention', error: message };
  }
}

/** Default event bus; kept here so callers do not import react-native just for this. */
export const emitFinishSyncEvent = (event: string, payload?: unknown) =>
  DeviceEventEmitter.emit(event, payload);

/** Test hook: forget configuration and any queued runs. */
export function __resetFinishSyncForTests(): void {
  deps = null;
  chain = Promise.resolve();
}
