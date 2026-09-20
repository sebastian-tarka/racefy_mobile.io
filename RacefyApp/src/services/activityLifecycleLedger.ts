/**
 * Pause/resume ledger for a live recording.
 *
 * Pausing and resuming are LOCAL operations: the athlete presses the button and
 * the recording changes state, network or not. The server is told afterwards.
 * This module keeps the two things that makes possible:
 *
 *  1. the device's own account of time spent paused — the server clocks pauses
 *     by when the request ARRIVES, so a pause made offline is invisible to it;
 *  2. the pause/resume calls that could not be delivered, in order, each with
 *     the moment it actually happened (`at`), to be replayed when the network
 *     is back.
 *
 * Once anything was delivered late (or not at all) the ledger is `dirty`, and the
 * finish request carries `total_paused_duration` — the device's figure, which the
 * server then prefers over its own. While the ledger is clean nothing extra is
 * sent and the online path is byte-for-byte what it was before.
 *
 * Plain module (no React), persisted in the tracking DB's kv table so it survives
 * an app kill mid-activity. Storage is injectable for tests.
 */

import { logger } from './logger';

export type LifecycleOp = { op: 'pause' | 'resume'; at: string };

export interface LedgerState {
  activityId: number;
  /** Completed pauses, in seconds. */
  pausedTotalSec: number;
  /** ISO start of the pause currently running; null while recording. */
  pauseStartedAt: string | null;
  /** Calls the server has not acknowledged yet, oldest first. */
  pendingOps: LifecycleOp[];
  /** Sticky: some pause/resume was not delivered on time. */
  dirty: boolean;
}

export interface LedgerStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface LifecycleApi<TActivity> {
  pauseActivity(id: number, opts: { at?: string; timeoutMs?: number }): Promise<TActivity>;
  resumeActivity(id: number, opts: { at?: string; timeoutMs?: number }): Promise<TActivity>;
}

/** How long a lifecycle call may hold up the UI before we carry on locally. */
export const LIFECYCLE_TIMEOUT_MS = 5000;

const key = (activityId: number) => `lifecycle:${activityId}`;

/**
 * No HTTP status = the request never got an answer (offline, timeout, abort).
 * 5xx/429 = the server may accept it later. Everything else (4xx) is a verdict:
 * retrying the same call will fail the same way.
 */
export function isTransientError(error: any): boolean {
  const status = error?.status;
  return status == null || status >= 500 || status === 429;
}

export function createLedger(
  activityId: number,
  seed: { pausedTotalSec?: number; pauseStartedAt?: string | null } = {},
): LedgerState {
  return {
    activityId,
    pausedTotalSec: seed.pausedTotalSec ?? 0,
    pauseStartedAt: seed.pauseStartedAt ?? null,
    pendingOps: [],
    dirty: false,
  };
}

export function loadLedger(storage: LedgerStorage, activityId: number): LedgerState | null {
  try {
    const raw = storage.get(key(activityId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LedgerState;
    return parsed?.activityId === activityId ? parsed : null;
  } catch (err) {
    logger.warn('activity', 'Failed to read lifecycle ledger', { activityId, error: err });
    return null;
  }
}

export function saveLedger(storage: LedgerStorage, ledger: LedgerState): void {
  try {
    storage.set(key(ledger.activityId), JSON.stringify(ledger));
  } catch (err) {
    logger.warn('activity', 'Failed to persist lifecycle ledger', {
      activityId: ledger.activityId,
      error: err,
    });
  }
}

export function clearLedger(storage: LedgerStorage, activityId: number): void {
  try {
    storage.remove(key(activityId));
  } catch {
    // Nothing to clean up is not an error.
  }
}

const secondsBetween = (fromIso: string, toIso: string) =>
  Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000));

/** The athlete paused at `at`. Idempotent: a second pause while paused is ignored. */
export function recordPause(ledger: LedgerState, at: string): LedgerState {
  if (ledger.pauseStartedAt) return ledger;
  return { ...ledger, pauseStartedAt: at };
}

/** The athlete resumed at `at`. Ignored when no pause is running. */
export function recordResume(ledger: LedgerState, at: string): LedgerState {
  if (!ledger.pauseStartedAt) return ledger;
  return {
    ...ledger,
    pausedTotalSec: ledger.pausedTotalSec + secondsBetween(ledger.pauseStartedAt, at),
    pauseStartedAt: null,
  };
}

/** Queue a call the server has not acknowledged. Marks the ledger dirty for good. */
export function enqueueOp(ledger: LedgerState, op: LifecycleOp): LedgerState {
  return { ...ledger, pendingOps: [...ledger.pendingOps, op], dirty: true };
}

/** Seconds paused as of `endedAt`, including a pause still running at that moment. */
export function totalPausedAt(ledger: LedgerState, endedAt: string): number {
  const running = ledger.pauseStartedAt ? secondsBetween(ledger.pauseStartedAt, endedAt) : 0;
  return ledger.pausedTotalSec + running;
}

export interface FlushResult<TActivity> {
  ledger: LedgerState;
  /** Server activity after the last acknowledged call, if any was acknowledged. */
  activity: TActivity | null;
  /** True when nothing is left to deliver. */
  drained: boolean;
}

/**
 * Deliver pending calls oldest-first. Stops at the first transient failure and
 * keeps the rest for later — order matters, a resume must not overtake its pause.
 * A call the server refuses outright (4xx: its state has diverged from ours) is
 * dropped: replaying it can never succeed, and the finish request's
 * `total_paused_duration` is what keeps the final numbers right regardless.
 */
export async function flushPendingOps<TActivity>(
  ledger: LedgerState,
  api: LifecycleApi<TActivity>,
  timeoutMs: number = LIFECYCLE_TIMEOUT_MS,
): Promise<FlushResult<TActivity>> {
  let current = ledger;
  let activity: TActivity | null = null;

  while (current.pendingOps.length > 0) {
    const [next, ...rest] = current.pendingOps;
    try {
      activity =
        next.op === 'pause'
          ? await api.pauseActivity(current.activityId, { at: next.at, timeoutMs })
          : await api.resumeActivity(current.activityId, { at: next.at, timeoutMs });
      current = { ...current, pendingOps: rest };
    } catch (error: any) {
      if (isTransientError(error)) {
        return { ledger: current, activity, drained: false };
      }
      logger.warn('activity', 'Server refused a late lifecycle call, dropping it', {
        activityId: current.activityId,
        op: next.op,
        at: next.at,
        status: error?.status,
        error: error?.message,
      });
      current = { ...current, pendingOps: rest };
    }
  }

  return { ledger: current, activity, drained: true };
}
