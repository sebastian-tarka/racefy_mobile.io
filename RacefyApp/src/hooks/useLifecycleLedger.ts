import { useCallback, useRef } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import * as trackingDb from '../services/trackingDb';
import {
  clearLedger,
  createLedger,
  enqueueOp,
  flushPendingOps,
  isTransientError,
  LIFECYCLE_TIMEOUT_MS,
  loadLedger,
  saveLedger,
  type LedgerState,
  type LedgerStorage,
} from '../services/activityLifecycleLedger';
import { isProvisionalActivity } from '../services/provisionalActivity';
import type { Activity } from '../types/api';
import { getErrorMessage, getErrorStatus } from '../utils/errors';

/** The lifecycle ledger lives in the tracking DB's kv table — it survives an app kill. */
const ledgerStorage: LedgerStorage = {
  get: trackingDb.getKv,
  set: trackingDb.setKv,
  remove: trackingDb.deleteKv,
};

type LifecycleOp = 'pause' | 'resume';

/**
 * Pause/resume are local operations; the server is told afterwards. The ledger
 * keeps the device's own pause total and any calls still waiting for a network
 * (see services/activityLifecycleLedger). Deliveries run one after another, in
 * the background: a resume must never overtake the pause it ends, and neither
 * may hold up the UI.
 *
 * `onActivityFresh` receives the server's newer copy of the activity after a
 * delivery (`op` null when it came from replaying the backlog).
 */
export function useLifecycleLedger(
  onActivityFresh: (fresh: Activity, op: LifecycleOp | null) => void,
) {
  const ledgerRef = useRef<LedgerState | null>(null);
  const lifecycleChainRef = useRef<Promise<void>>(Promise.resolve());
  const onFreshRef = useRef(onActivityFresh);
  onFreshRef.current = onActivityFresh;

  const commitLedger = useCallback((ledger: LedgerState) => {
    ledgerRef.current = ledger;
    saveLedger(ledgerStorage, ledger);
  }, []);

  /** The ledger of this activity: in memory, else persisted, else seeded from the server. */
  const ensureLedger = useCallback((activity: Activity): LedgerState => {
    if (ledgerRef.current?.activityId === activity.id) return ledgerRef.current;
    const ledger =
      loadLedger(ledgerStorage, activity.id) ??
      createLedger(activity.id, {
        pausedTotalSec: activity.total_paused_duration || 0,
        // Older API builds do not send paused_at; "now" is a harmless stand-in —
        // a seeded ledger is clean, so its total is never sent to the server.
        pauseStartedAt:
          activity.status === 'paused' ? (activity.paused_at ?? new Date().toISOString()) : null,
      });
    ledgerRef.current = ledger;
    return ledger;
  }, []);

  const dropLedger = useCallback((activityId: number) => {
    ledgerRef.current = null;
    clearLedger(ledgerStorage, activityId);
  }, []);

  /** A recording that started offline got its server id: move the ledger over. */
  const rekeyLedger = useCallback(
    (fromId: number, toId: number) => {
      const ledger = ledgerRef.current ?? loadLedger(ledgerStorage, fromId);
      clearLedger(ledgerStorage, fromId);
      if (ledger) commitLedger({ ...ledger, activityId: toId });
    },
    [commitLedger],
  );

  /**
   * Tell the server about a pause/resume that has ALREADY happened locally.
   * Never throws: with no network the call is queued with its real timestamp and
   * replayed later; a call the server refuses leaves the ledger dirty, so finish
   * sends the device's pause total. Returns the freshest activity we know of.
   */
  const deliverLifecycle = useCallback(
    async (activity: Activity, op: LifecycleOp, at: string): Promise<Activity> => {
      const ledger = ensureLedger(activity);

      // The server has never heard of this activity: keep the call for the day it
      // has (createServerActivity replays the queue), and mark the ledger dirty —
      // finish will carry the device's pause total.
      if (isProvisionalActivity(activity)) {
        commitLedger(enqueueOp(ledger, { op, at }));
        return activity;
      }

      // Earlier calls are still waiting — this one must queue behind them.
      if (ledger.pendingOps.length > 0) {
        const queued = enqueueOp(ledger, { op, at });
        commitLedger(queued);
        const res = await flushPendingOps(queued, api);
        // Pause accounting may have moved on meanwhile; only the queue is ours to write.
        if (ledgerRef.current?.activityId === activity.id) {
          commitLedger({
            ...ledgerRef.current,
            pendingOps: res.ledger.pendingOps,
            dirty: true,
          });
        }
        return res.activity ?? activity;
      }

      try {
        const opts = { at, timeoutMs: LIFECYCLE_TIMEOUT_MS };
        return op === 'pause'
          ? await api.pauseActivity(activity.id, opts)
          : await api.resumeActivity(activity.id, opts);
      } catch (error) {
        logger.warn('activity', `Could not deliver ${op}, continuing locally`, {
          id: activity.id,
          at,
          status: getErrorStatus(error),
          error: getErrorMessage(error),
        });
        // Finished or discarded while this call was in flight — nothing left to account for.
        if (ledgerRef.current?.activityId !== activity.id) return activity;
        const latest = ledgerRef.current;
        commitLedger(
          isTransientError(error) ? enqueueOp(latest, { op, at }) : { ...latest, dirty: true },
        );
        return activity;
      }
    },
    [ensureLedger, commitLedger],
  );

  /** Queue a delivery behind the previous one and return immediately. */
  const scheduleLifecycle = useCallback(
    (activity: Activity, op: LifecycleOp, at: string) => {
      lifecycleChainRef.current = lifecycleChainRef.current
        .then(() => deliverLifecycle(activity, op, at))
        .then((fresh) => {
          if (fresh === activity) return;
          onFreshRef.current(fresh, op);
        })
        .catch((error) => {
          logger.warn('activity', 'Lifecycle delivery failed unexpectedly', { op, error });
        });
    },
    [deliverLifecycle],
  );

  /** Replay queued pause/resume calls; called from the sync tick once points go through. */
  const flushLifecycleBacklog = useCallback(async () => {
    const ledger = ledgerRef.current;
    if (!ledger || ledger.pendingOps.length === 0) return;
    // Through the same chain as live pause/resume calls, so the two never interleave.
    lifecycleChainRef.current = lifecycleChainRef.current
      .then(async () => {
        const current = ledgerRef.current;
        if (!current || current.activityId !== ledger.activityId) return;
        if (current.pendingOps.length === 0) return;
        const res = await flushPendingOps(current, api);
        if (ledgerRef.current?.activityId === current.activityId) {
          commitLedger({ ...ledgerRef.current, pendingOps: res.ledger.pendingOps });
        }
        if (res.activity) onFreshRef.current(res.activity, null);
      })
      .catch(() => {});
  }, [commitLedger]);

  /** Resolves once every delivery queued so far has settled. */
  const lifecycleSettled = useCallback(() => lifecycleChainRef.current, []);

  return {
    ledgerRef,
    commitLedger,
    ensureLedger,
    dropLedger,
    rekeyLedger,
    scheduleLifecycle,
    flushLifecycleBacklog,
    lifecycleSettled,
  };
}
