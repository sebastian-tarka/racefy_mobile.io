import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { emitRefresh } from '../services/refreshEvents';
import type {
  WorkoutSession,
  WorkoutSessionAddSetInput,
  WorkoutSessionCompleteInput,
  WorkoutSessionCompleteResponse,
  WorkoutSessionSet,
  WorkoutSessionSetUpdate,
  WorkoutSessionStats,
} from '../types/workouts';

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

/**
 * State for one in-progress session: the checklist, the serial request queue
 * for set updates (the athlete taps faster than the network answers), the
 * rest timer, and completion / skip.
 *
 * Every set mutation is optimistic — the row changes at once, the PUT goes
 * out in order, and a failure rolls the row back and surfaces the message.
 */
export function useWorkoutSession(sessionId: number, onError: (message: string) => void) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rest, setRest] = useState<RestState | null>(null);
  const [now, setNow] = useState(Date.now());
  const sessionRef = useRef<WorkoutSession | null>(null);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const commit = useCallback((next: WorkoutSession | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  /** Reload from the server (also restores the rest timer from rest_started_at). */
  const reload = useCallback(async () => {
    try {
      const fresh = await api.getWorkoutSession(sessionId);
      commit(fresh);
      restoreRest(fresh, setRest);
    } catch (error: any) {
      logger.error('api', 'Failed to load workout session', { sessionId, error: error.message });
      onErrorRef.current(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, commit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // 1 s clock for the stopwatch and the rest countdown.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  /** Apply a change to one set locally. */
  const patchSet = useCallback(
    (setId: number, patch: Partial<WorkoutSessionSet>, stats?: WorkoutSessionStats) => {
      const current = sessionRef.current;
      if (!current?.exercises) return;
      commit({
        ...current,
        stats: stats ?? current.stats,
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

  /** Serialise a set update: optimistic patch, queued PUT, rollback on failure. */
  const enqueueSetUpdate = useCallback(
    (setId: number, optimistic: Partial<WorkoutSessionSet>, body: WorkoutSessionSetUpdate) => {
      const before = findSet(setId);
      if (!before) return;
      patchSet(setId, optimistic);
      queueRef.current = queueRef.current
        .then(async () => {
          const res = await api.updateWorkoutSessionSet(setId, body);
          patchSet(setId, res.data, res.stats);
        })
        .catch((error: any) => {
          patchSet(setId, before);
          logger.warn('api', 'Set update failed, rolled back', { setId, error: error.message });
          onErrorRef.current(error.message);
        });
    },
    [findSet, patchSet],
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
      queueRef.current = queueRef.current
        .then(() =>
          api.updateWorkoutSessionSet(r.setId, {
            rest_seconds: Math.max(0, Math.round(actualSeconds)),
          }),
        )
        .then((res) => patchSet(r.setId, res.data, res.stats))
        .catch(() => {});
    },
    [rest, patchSet],
  );

  const extendRest = useCallback((seconds: number) => {
    setRest((r) =>
      r ? { ...r, endsAt: r.endsAt + seconds * 1000, seconds: r.seconds + seconds } : r,
    );
  }, []);

  const addSet = useCallback(
    async (input: WorkoutSessionAddSetInput) => {
      try {
        const created = await api.addWorkoutSessionSet(sessionId, input);
        const current = sessionRef.current;
        if (!current?.exercises) return;
        const exists = current.exercises.some((ex) => ex.exercise_order === created.exercise_order);
        if (exists) {
          commit({
            ...current,
            stats: current.stats
              ? { ...current.stats, sets_total: current.stats.sets_total + 1 }
              : current.stats,
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
      } catch (error: any) {
        onErrorRef.current(error.message);
      }
    },
    [sessionId, commit, reload],
  );

  const removeSet = useCallback(
    async (setId: number) => {
      const current = sessionRef.current;
      if (!current?.exercises) return;
      const before = current;
      commit({
        ...current,
        stats: current.stats
          ? { ...current.stats, sets_total: Math.max(0, current.stats.sets_total - 1) }
          : current.stats,
        exercises: current.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.filter((s) => s.id !== setId),
        })),
      });
      try {
        await api.deleteWorkoutSessionSet(setId);
      } catch (error: any) {
        commit(before);
        onErrorRef.current(error.message);
      }
    },
    [commit],
  );

  const complete = useCallback(
    async (input: WorkoutSessionCompleteInput): Promise<WorkoutSessionCompleteResponse> => {
      // Let queued set updates land first so the activity description is complete.
      await queueRef.current.catch(() => {});
      const res = await api.completeWorkoutSession(sessionId, input);
      commit(res.data);
      setRest(null);
      emitRefresh('workouts');
      emitRefresh('activities');
      return res;
    },
    [sessionId, commit],
  );

  const skip = useCallback(
    async (notes?: string) => {
      await queueRef.current.catch(() => {});
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
