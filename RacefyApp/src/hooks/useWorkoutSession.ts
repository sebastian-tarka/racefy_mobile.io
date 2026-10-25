import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import i18n from '../i18n';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { emitRefresh } from '../services/refreshEvents';
import type { OutboxEvent, StrengthOp } from '../services/strength/sessionOutbox';
import { STRENGTH_OUTBOX_EVENT, strengthOutbox } from '../services/strength/strengthOutbox';
import type {
  WorkoutSession,
  WorkoutSessionAddSetInput,
  WorkoutSessionCompleteInput,
  WorkoutSessionSet,
  WorkoutSessionSetUpdate,
  WorkoutSessionStats,
} from '../types/workouts';
import { getErrorMessage, getErrorStatus } from '../utils/errors';

export interface SetValues {
  weightKg?: number | null;
  reps?: number | null;
  durationSeconds?: number | null;
}

export interface RestState {
  /** Set whose rest this is. */
  setId: number;
  /** Wall-clock end of the rest (ms). */
  endsAt: number;
  /** Planned length, for the bar. */
  seconds: number;
}

export type CompleteOutcome =
  | { queued: false; activityId: number | null }
  /** No network: the session is closed on the phone and goes out with the queue. */
  | { queued: true };

/** What the server would count — the phone counts it itself so it stays right offline. */
function computeStats(exercises: WorkoutSession['exercises']): WorkoutSessionStats | undefined {
  if (!exercises) return undefined;
  const sets = exercises.flatMap((ex) => ex.sets);
  const done = sets.filter((x) => x.is_completed);
  const volume = done.reduce((sum, x) => sum + (x.weight_kg ?? 0) * (x.reps ?? 0), 0);
  return {
    sets_total: sets.length,
    sets_completed: done.length,
    volume_kg: Math.round(volume * 10) / 10,
    exercises: new Set(sets.map((x) => x.exercise_order)).size,
  };
}

function isNetworkFailure(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status == null || status >= 500 || status === 429;
}

/**
 * State for one in-progress session: the checklist, the rest timer, and
 * completion / skip.
 *
 * Every set change is optimistic and goes through the strength outbox
 * (services/strength/sessionOutbox): the row changes at once, the request is
 * queued on disk and sent in order. Without a network the queue simply waits —
 * the athlete keeps going, and "Finish" closes the session on the phone and
 * sends it when the connection is back. A change the server refuses (4xx) is
 * reported and the session is reloaded from the server.
 */
export function useWorkoutSession(sessionId: number, onError: (message: string) => void) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rest, setRest] = useState<RestState | null>(null);
  const [now, setNow] = useState(Date.now());
  const [pendingCount, setPendingCount] = useState(
    () => strengthOutbox.pendingOps(sessionId).length,
  );
  const sessionRef = useRef<WorkoutSession | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  /** The complete op's fate, read by complete() once the flush returns. */
  const completionRef = useRef<{ activityId: number | null } | { rejected: string } | null>(null);
  /** Bumped on every local change, so a server answer older than it is ignored. */
  const localEditsRef = useRef(0);

  const commit = useCallback(
    (next: WorkoutSession | null) => {
      const withStats = next?.exercises ? { ...next, stats: computeStats(next.exercises) } : next;
      sessionRef.current = withStats;
      setSession(withStats);
      if (!withStats) return;
      // Keep the phone's copy of the open session (and of one closed offline) —
      // it is what the screen shows when the server cannot be reached.
      if (withStats.status === 'in_progress' || strengthOutbox.hasPendingComplete(sessionId)) {
        strengthOutbox.saveSnapshot(withStats);
      } else {
        strengthOutbox.clearSnapshot(sessionId);
      }
    },
    [sessionId],
  );

  /**
   * Load the session. The phone's copy (if this is the session it holds) shows
   * at once — reopening offline, or on a network that hangs, must not wait for
   * a request. Queued changes go out next; while any are still waiting the
   * phone's copy stays the truth, otherwise the server's answer replaces it —
   * unless the athlete changed something while that answer was on its way.
   * Also restores the rest timer from rest_started_at.
   */
  const reload = useCallback(async () => {
    const stored = strengthOutbox.readSnapshot();
    const snapshot = stored?.id === sessionId ? stored : null;
    if (snapshot) {
      commit(snapshot);
      restoreRest(snapshot, setRest);
      setIsLoading(false);
    }
    try {
      if (strengthOutbox.hasPending(sessionId)) await strengthOutbox.flush();
      if (snapshot && strengthOutbox.hasPending(sessionId)) return;
      const editsBefore = localEditsRef.current;
      const fresh = await api.getWorkoutSession(sessionId);
      if (localEditsRef.current !== editsBefore || strengthOutbox.hasPending(sessionId)) return;
      commit(fresh);
      restoreRest(fresh, setRest);
    } catch (error) {
      if (snapshot && isNetworkFailure(error)) return;
      logger.error('api', 'Failed to load workout session', {
        sessionId,
        error: getErrorMessage(error),
      });
      onErrorRef.current(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, commit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // What the outbox reports back: queue size, refusals, a completion sent later.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(STRENGTH_OUTBOX_EVENT, (e: OutboxEvent) => {
      if (e.type === 'changed') {
        setPendingCount(strengthOutbox.pendingOps(sessionId).length);
        return;
      }
      if (e.sessionId !== sessionId) return;
      if (e.type === 'completed') {
        completionRef.current = { activityId: e.activityId };
        commit(e.session);
        return;
      }
      // Refused: the phone's version is wrong somewhere — take the server's.
      if (e.op.kind === 'complete') {
        completionRef.current = { rejected: e.message };
      } else {
        onErrorRef.current(e.message);
      }
      void reload();
    });
    return () => sub.remove();
  }, [sessionId, commit, reload]);

  // 1 s clock for the stopwatch and the rest countdown.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  /** Apply a change to one set locally. */
  const patchSet = useCallback(
    (setId: number, patch: Partial<WorkoutSessionSet>) => {
      const current = sessionRef.current;
      if (!current?.exercises) return;
      commit({
        ...current,
        exercises: current.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
        })),
      });
    },
    [commit],
  );

  const findSet = useCallback((setId: number): WorkoutSessionSet | null => {
    for (const ex of sessionRef.current?.exercises ?? []) {
      const hit = ex.sets.find((s) => s.id === setId);
      if (hit) return hit;
    }
    return null;
  }, []);

  /** Queue an op and try to send it; without a network it waits in the outbox. */
  const send = useCallback(
    (op: StrengthOp) => {
      localEditsRef.current += 1;
      strengthOutbox.enqueue(sessionId, op);
      void strengthOutbox.flush();
    },
    [sessionId],
  );

  /** A set update: optimistic patch, then the PUT through the outbox. */
  const enqueueSetUpdate = useCallback(
    (setId: number, optimistic: Partial<WorkoutSessionSet>, body: WorkoutSessionSetUpdate) => {
      if (!findSet(setId)) return;
      patchSet(setId, optimistic);
      send({ kind: 'set', setId, body });
    },
    [findSet, patchSet, send],
  );

  const startSet = useCallback(
    (setId: number) => {
      const nowIso = new Date().toISOString();
      enqueueSetUpdate(setId, { started_at: nowIso }, { start: true, started_at: nowIso });
    },
    [enqueueSetUpdate],
  );

  const completeSet = useCallback(
    (setId: number, values: SetValues) => {
      const set = findSet(setId);
      if (!set) return;
      const nowIso = new Date().toISOString();
      const restSeconds = set.planned.rest_seconds ?? 0;
      const timed = set.planned.target_type === 'seconds';
      const optimistic: Partial<WorkoutSessionSet> = {
        is_completed: true,
        completed_at: nowIso,
        rest_started_at: nowIso,
        weight_kg: values.weightKg ?? set.weight_kg,
        reps: timed ? set.reps : (values.reps ?? set.reps),
        duration_seconds: timed
          ? (values.durationSeconds ?? set.duration_seconds)
          : set.duration_seconds,
      };
      const body: WorkoutSessionSetUpdate = {
        is_completed: true,
        rest: true,
        completed_at: nowIso,
        rest_started_at: nowIso,
        weight_kg: optimistic.weight_kg ?? null,
        ...(timed
          ? { duration_seconds: optimistic.duration_seconds ?? null }
          : { reps: optimistic.reps ?? null }),
      };
      enqueueSetUpdate(setId, optimistic, body);
      if (restSeconds > 0) {
        setRest({ setId, endsAt: Date.now() + restSeconds * 1000, seconds: restSeconds });
      } else {
        setRest(null);
      }
    },
    [findSet, enqueueSetUpdate],
  );

  const reopenSet = useCallback(
    (setId: number) => {
      enqueueSetUpdate(setId, { is_completed: false, completed_at: null }, { is_completed: false });
      setRest((r) => (r?.setId === setId ? null : r));
    },
    [enqueueSetUpdate],
  );

  /** Record the actual rest length once it ends (skipped early or ran out). */
  const finishRest = useCallback(
    (actualSeconds: number) => {
      const r = rest;
      setRest(null);
      if (!r) return;
      const restSeconds = Math.max(0, Math.round(actualSeconds));
      patchSet(r.setId, { rest_seconds: restSeconds });
      send({ kind: 'set', setId: r.setId, body: { rest_seconds: restSeconds } });
    },
    [rest, patchSet, send],
  );

  const extendRest = useCallback((seconds: number) => {
    setRest((r) =>
      r ? { ...r, endsAt: r.endsAt + seconds * 1000, seconds: r.seconds + seconds } : r,
    );
  }, []);

  /**
   * Adding a set needs the server — it hands out the set's id, which every later
   * change refers to — so this one stays online-only.
   */
  const addSet = useCallback(
    async (input: WorkoutSessionAddSetInput) => {
      try {
        // Earlier changes first, so the new set lands after them.
        await strengthOutbox.flush();
        const created = await api.addWorkoutSessionSet(sessionId, input);
        const current = sessionRef.current;
        if (!current?.exercises) return;
        const exists = current.exercises.some((ex) => ex.exercise_order === created.exercise_order);
        if (exists) {
          commit({
            ...current,
            exercises: current.exercises.map((ex) =>
              ex.exercise_order === created.exercise_order
                ? {
                    ...ex,
                    sets: [...ex.sets, created],
                    planned: { ...ex.planned, sets: ex.planned.sets + 1 },
                  }
                : ex,
            ),
          });
        } else {
          // Ad-hoc exercise: the server built a new group — reload to get its header.
          await reload();
        }
      } catch (error) {
        onErrorRef.current(
          isNetworkFailure(error)
            ? i18n.t('strengthPlans.session.offline.addSet')
            : getErrorMessage(error),
        );
      }
    },
    [sessionId, commit, reload],
  );

  const removeSet = useCallback(
    async (setId: number) => {
      const current = sessionRef.current;
      if (!current?.exercises) return;
      commit({
        ...current,
        exercises: current.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.filter((s) => s.id !== setId),
        })),
      });
      send({ kind: 'delete', setId });
    },
    [commit, send],
  );

  /**
   * Close the session. The complete call goes out behind every queued set
   * change, so the activity is built from the full log. Without a network it
   * stays queued — the session is closed on the phone, stamped with this
   * moment, and the outbox runner delivers it later.
   */
  const complete = useCallback(
    async (input: WorkoutSessionCompleteInput): Promise<CompleteOutcome> => {
      const completedAt = new Date().toISOString();
      completionRef.current = null;
      strengthOutbox.enqueue(sessionId, {
        kind: 'complete',
        input: { ...input, completed_at: completedAt },
      });
      await strengthOutbox.flush();
      setRest(null);
      const fate = completionRef.current as
        | { activityId: number | null }
        | { rejected: string }
        | null;
      if (fate && 'rejected' in fate) throw new Error(fate.rejected);
      if (fate) return { queued: false, activityId: fate.activityId };
      const current = sessionRef.current;
      if (current) {
        commit({
          ...current,
          status: 'completed',
          completed_at: completedAt,
          duration_seconds: input.duration_seconds ?? current.duration_seconds,
          rpe: input.rpe ?? current.rpe,
          notes: input.notes !== undefined ? input.notes : current.notes,
        });
      }
      return { queued: true };
    },
    [sessionId, commit],
  );

  /** Skipping is online-only: it would otherwise race the queued sets it discards. */
  const skip = useCallback(
    async (notes?: string) => {
      await strengthOutbox.flush();
      if (strengthOutbox.hasPending(sessionId)) {
        throw new Error(i18n.t('strengthPlans.session.offline.skip'));
      }
      const res = await api.skipWorkoutSession(sessionId, notes);
      commit(res);
      setRest(null);
      emitRefresh('workouts');
    },
    [sessionId, commit],
  );

  const elapsedSeconds = useMemo(() => {
    if (!session?.started_at) return 0;
    if (session.duration_seconds != null && session.status !== 'in_progress') {
      return session.duration_seconds;
    }
    return Math.max(0, Math.floor((now - new Date(session.started_at).getTime()) / 1000));
  }, [session?.started_at, session?.duration_seconds, session?.status, now]);

  const restRemaining = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : null;

  /** First set that is not completed — where the athlete is. */
  const activeSetId = useMemo(() => {
    for (const ex of session?.exercises ?? []) {
      const next = ex.sets.find((s) => !s.is_completed);
      if (next) return next.id;
    }
    return null;
  }, [session?.exercises]);

  return {
    session,
    isLoading,
    reload,
    elapsedSeconds,
    activeSetId,
    rest,
    restRemaining,
    /** Changes still waiting for the network. */
    pendingCount,
    startSet,
    completeSet,
    reopenSet,
    finishRest,
    extendRest,
    addSet,
    removeSet,
    complete,
    skip,
  };
}

/** Rebuild the rest timer after a reload / app restart from the server clocks. */
function restoreRest(session: WorkoutSession, setRest: (r: RestState | null) => void): void {
  if (session.status !== 'in_progress' || !session.exercises) {
    setRest(null);
    return;
  }
  let latest: WorkoutSessionSet | null = null;
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      if (s.is_completed && s.rest_started_at && s.rest_seconds == null) {
        if (!latest || s.rest_started_at > (latest.rest_started_at ?? '')) latest = s;
      }
    }
  }
  if (!latest || !latest.rest_started_at) {
    setRest(null);
    return;
  }
  const planned = latest.planned.rest_seconds ?? 0;
  const endsAt = new Date(latest.rest_started_at).getTime() + planned * 1000;
  if (planned > 0 && endsAt > Date.now()) {
    setRest({ setId: latest.id, endsAt, seconds: planned });
  } else {
    setRest(null);
  }
}
