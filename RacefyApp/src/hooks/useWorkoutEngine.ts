import { useCallback, useEffect, useRef, useState } from 'react';
import i18n from 'i18next';
import { logger } from '../services/logger';
import {
  advanceWorkout,
  createWorkoutEngine,
  getWorkoutProgress,
  skipWorkoutSegment,
  type EngineSnapshot,
  type SegmentProgress,
  type WorkoutEngineState,
} from '../services/workout/engine';
import { handleWorkoutEvents, type WorkoutCueContext } from '../services/workout/cues';
import {
  cancelGoalNotification,
  scheduleGoalNotification,
} from '../services/workout/goalNotification';
import {
  loadWorkoutEngineState,
  loadWorkoutSession,
  saveTimeAnchor,
  saveWorkoutEngineState,
  saveWorkoutSession,
} from '../services/workout/storage';
import type { SpokenUnits } from '../services/workout/templates';
import type { AudioCoachSettings } from '../types/audioCoach';
import type { WorkoutCuePrefs, WorkoutPlan } from '../types/workout';

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'finished';

interface Params {
  plan: WorkoutPlan | null;
  status: RecordingStatus;
  activityId: number | null;
  /** Recording timer, pauses excluded (`useActivityTimer().localDuration`). */
  activeSeconds: number;
  /** Cumulative recorded distance in metres. */
  distanceM: number;
  cuePrefs: WorkoutCuePrefs;
  coachSettings: AudioCoachSettings;
  tier: 'free' | 'plus' | 'pro';
  isOnline: boolean;
  units: SpokenUnits;
  /**
   * Called when a workout session is found in storage for the activity being
   * recovered (app restarted mid-run) — the screen adopts the plan so its
   * chip and card come back.
   */
  onRestorePlan: (plan: WorkoutPlan) => void;
}

export interface WorkoutEngineHandle {
  state: WorkoutEngineState | null;
  progress: SegmentProgress | null;
  /** End the current segment now ("Lap"). No-op without an active session. */
  skip: () => void;
}

/**
 * Drives the workout engine from the recording screen: starts a session when
 * recording begins with a plan, feeds every timer/GPS tick to the reducer,
 * turns the events into cues, and keeps storage in sync so the background
 * task and an app restart pick up exactly where this left off.
 *
 * Idempotent and unconditional — call it on every render of the screen.
 */
export function useWorkoutEngine({
  plan,
  status,
  activityId,
  activeSeconds,
  distanceM,
  cuePrefs,
  coachSettings,
  tier,
  isOnline,
  units,
  onRestorePlan,
}: Params): WorkoutEngineHandle {
  const [state, setState] = useState<WorkoutEngineState | null>(null);
  const stateRef = useRef<WorkoutEngineState | null>(null);
  const planRef = useRef<WorkoutPlan | null>(plan);
  planRef.current = plan;
  const prevStatusRef = useRef<RecordingStatus>(status);
  const restoreAttemptedForRef = useRef<number | null>(null);

  // Latest cue context without re-running effects on every settings change.
  const cueCtxRef = useRef<WorkoutCueContext>({
    prefs: cuePrefs,
    coachSettings,
    tier,
    isOnline,
    units,
    goal: plan?.goal,
  });
  cueCtxRef.current = { prefs: cuePrefs, coachSettings, tier, isOnline, units, goal: plan?.goal };

  const commit = useCallback((next: WorkoutEngineState | null) => {
    stateRef.current = next;
    setState(next);
    if (next) void saveWorkoutEngineState(next);
  }, []);

  const notificationContent = useCallback(() => {
    const p = planRef.current;
    const goalLabel = p?.name || i18n.t('recording.workout.notification.goal');
    return {
      title: i18n.t('recording.workout.notification.title'),
      body: i18n.t('recording.workout.notification.body', { goal: goalLabel }),
    };
  }, []);

  /** Time goals only: schedule the suspended-app safety net for the remaining seconds. */
  const armTimeGoalNotification = useCallback(
    (current: WorkoutEngineState, now: EngineSnapshot) => {
      const p = planRef.current;
      if (!p || p.mode !== 'goal' || p.goal?.type !== 'time' || current.completed) return;
      const remaining = p.goal.seconds - (now.activeSeconds - current.segmentStart.activeSeconds);
      void scheduleGoalNotification(remaining, notificationContent());
    },
    [notificationContent],
  );

  // ── session lifecycle: start / restore / pause / resume / end ─────────────
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    const now: EngineSnapshot = { activeSeconds, distanceM };

    if (status === 'recording' && !stateRef.current) {
      // Either a fresh start with a plan, or a recovered activity whose
      // session is still in storage.
      const currentPlan = planRef.current;
      if (currentPlan) {
        const fresh = createWorkoutEngine(currentPlan, now);
        commit(fresh);
        void saveWorkoutSession({
          plan: currentPlan,
          activityId,
          language: coachSettings.language,
          units,
          startedAtMs: Date.now(),
        });
        void saveTimeAnchor({ activeSeconds, wallMs: Date.now(), paused: false });
        armTimeGoalNotification(fresh, now);
        logger.info('activity', 'Workout session started', {
          planId: currentPlan.id,
          mode: currentPlan.mode,
        });
      } else if (activityId != null && restoreAttemptedForRef.current !== activityId) {
        restoreAttemptedForRef.current = activityId;
        void (async () => {
          const session = await loadWorkoutSession();
          if (!session || session.activityId !== activityId) return;
          const stored = await loadWorkoutEngineState();
          if (!stored || stored.planId !== session.plan.id) return;
          // Still recording and nobody started a session meanwhile.
          if (stateRef.current || prevStatusRef.current !== 'recording') return;
          onRestorePlan(session.plan);
          stateRef.current = stored;
          setState(stored);
          void saveTimeAnchor({ activeSeconds, wallMs: Date.now(), paused: false });
          armTimeGoalNotification(stored, now);
          logger.info('activity', 'Workout session restored', { planId: session.plan.id });
        })();
      }
      return;
    }

    if (!stateRef.current) return;

    if (status === 'paused' && prev === 'recording') {
      void saveTimeAnchor({ activeSeconds, wallMs: Date.now(), paused: true });
      void cancelGoalNotification();
    } else if (status === 'recording' && prev === 'paused') {
      void saveTimeAnchor({ activeSeconds, wallMs: Date.now(), paused: false });
      armTimeGoalNotification(stateRef.current, now);
    } else if (status === 'idle' || status === 'finished') {
      // The screen clears storage on save/discard; here we only drop local state.
      void cancelGoalNotification();
      stateRef.current = null;
      setState(null);
      restoreAttemptedForRef.current = null;
    }
    // activeSeconds/distanceM are read at transition time only — deliberately
    // not dependencies, or this would run on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activityId, commit, armTimeGoalNotification, onRestorePlan]);

  // Plan changed or cleared mid-run. A new goal restarts the engine from the
  // ACTIVITY start (not from now): "change to 10 km" after 4 km means 10 km
  // total, which is what anyone means by it. Clearing drops the engine; the
  // screen wipes storage.
  useEffect(() => {
    const current = stateRef.current;
    if (!current) return;
    if (!plan) {
      void cancelGoalNotification();
      stateRef.current = null;
      setState(null);
      return;
    }
    if (plan.id === current.planId) return;
    const replaced: WorkoutEngineState = {
      ...createWorkoutEngine(plan, current.segmentStart),
      lastSnapshot: current.lastSnapshot,
    };
    commit(replaced);
    void (async () => {
      const session = await loadWorkoutSession();
      await saveWorkoutSession({
        plan,
        activityId,
        language: coachSettings.language,
        units,
        startedAtMs: session?.startedAtMs ?? Date.now(),
      });
    })();
    if (status === 'recording') {
      armTimeGoalNotification(replaced, { activeSeconds, distanceM });
    } else {
      void cancelGoalNotification();
    }
    // Only the plan identity matters here; the rest is read at change time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id, commit, armTimeGoalNotification]);

  // Once the server activity id is known, stamp it on the stored session so a
  // restart can match the two.
  useEffect(() => {
    if (!stateRef.current || activityId == null) return;
    void (async () => {
      const session = await loadWorkoutSession();
      if (session && session.activityId !== activityId) {
        await saveWorkoutSession({ ...session, activityId });
      }
    })();
  }, [activityId]);

  // ── tick: advance on every timer / distance change while recording ────────
  useEffect(() => {
    const current = stateRef.current;
    if (!current || status !== 'recording' || current.completed) return;

    const { state: next, events } = advanceWorkout(current, { activeSeconds, distanceM });
    if (events.length === 0) {
      // Keep the reference stable when nothing happened; lastSnapshot only
      // matters across boundaries and is refreshed on the next event.
      return;
    }

    if (events.some((e) => e.type === 'goal_reached' || e.type === 'workout_complete')) {
      void cancelGoalNotification();
    }
    handleWorkoutEvents(events, cueCtxRef.current);
    commit(next);
  }, [activeSeconds, distanceM, status, commit]);

  const skip = useCallback(() => {
    const current = stateRef.current;
    if (!current || current.completed) return;
    const { state: next, events } = skipWorkoutSegment(current, { activeSeconds, distanceM });
    if (events.some((e) => e.type === 'goal_reached' || e.type === 'workout_complete')) {
      void cancelGoalNotification();
    }
    handleWorkoutEvents(events, cueCtxRef.current);
    commit(next);
  }, [activeSeconds, distanceM, commit]);

  const progress = state ? getWorkoutProgress(state, { activeSeconds, distanceM }) : null;

  return { state, progress, skip };
}
