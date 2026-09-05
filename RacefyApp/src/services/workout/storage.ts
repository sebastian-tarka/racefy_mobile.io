/**
 * Persistence for the active workout — shared by the foreground hook and the
 * headless background location task, which is why everything here is plain
 * AsyncStorage with no React in sight.
 *
 * What lives where:
 * - session: the plan the athlete started with, plus the bits of context the
 *   background task cannot derive on its own (language, units, activity id).
 * - engine state: the reducer state, written after every batch of events by
 *   whichever context fired them. `firedKeys` inside it is what makes the two
 *   contexts idempotent with respect to each other.
 * - time anchor: lets the background task reconstruct ACTIVE seconds (timer
 *   without pauses) from wall-clock time. Written on start / pause / resume.
 * - cue prefs: local-only preference, no server round-trip.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AudioCoachLanguage } from '../../types/audioCoach';
import type { WorkoutCuePrefs, WorkoutGoal, WorkoutPlan } from '../../types/workout';
import { DEFAULT_WORKOUT_CUE_PREFS } from '../../types/workout';
import type { WorkoutEngineState } from './engine';
import type { SpokenUnits } from './templates';

const KEYS = {
  session: '@racefy:workout:session',
  engine: '@racefy:workout:engine',
  anchor: '@racefy:workout:timeAnchor',
  prefs: '@racefy:workout:cuePrefs',
  lastGoal: '@racefy:workout:lastGoal',
  notification: '@racefy:workout:goalNotificationId',
} as const;

export interface WorkoutSession {
  plan: WorkoutPlan;
  /** Server activity id, once known. Used to match a restored session to the recovered activity. */
  activityId: number | null;
  language: AudioCoachLanguage;
  units: SpokenUnits;
  startedAtMs: number;
}

export interface TimeAnchor {
  /** Active seconds at the moment the anchor was written. */
  activeSeconds: number;
  /** Wall-clock time when it was written. */
  wallMs: number;
  /** While paused the clock is frozen at `activeSeconds`. */
  paused: boolean;
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage failures must never break a recording; the worst case is a
    // background cue that repeats what the foreground already said.
  }
}

// ── session ─────────────────────────────────────────────────────────────────

export function saveWorkoutSession(session: WorkoutSession): Promise<void> {
  return writeJson(KEYS.session, session);
}

export function loadWorkoutSession(): Promise<WorkoutSession | null> {
  return readJson<WorkoutSession>(KEYS.session);
}

/** Forget everything about the current workout (finish, discard, or plan cleared). */
export async function clearWorkoutSession(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(KEYS.session),
    AsyncStorage.removeItem(KEYS.engine),
    AsyncStorage.removeItem(KEYS.anchor),
  ]).catch(() => {});
}

// ── engine state ────────────────────────────────────────────────────────────

export function saveWorkoutEngineState(state: WorkoutEngineState): Promise<void> {
  return writeJson(KEYS.engine, state);
}

export function loadWorkoutEngineState(): Promise<WorkoutEngineState | null> {
  return readJson<WorkoutEngineState>(KEYS.engine);
}

// ── time anchor ─────────────────────────────────────────────────────────────

export function saveTimeAnchor(anchor: TimeAnchor): Promise<void> {
  return writeJson(KEYS.anchor, anchor);
}

export function loadTimeAnchor(): Promise<TimeAnchor | null> {
  return readJson<TimeAnchor>(KEYS.anchor);
}

/** Active seconds now, as the background task sees them. */
export function activeSecondsFromAnchor(anchor: TimeAnchor, nowMs: number = Date.now()): number {
  if (anchor.paused) return anchor.activeSeconds;
  return anchor.activeSeconds + Math.max(0, (nowMs - anchor.wallMs) / 1000);
}

// ── cue prefs ───────────────────────────────────────────────────────────────

export async function loadWorkoutCuePrefs(): Promise<WorkoutCuePrefs> {
  const stored = await readJson<Partial<WorkoutCuePrefs>>(KEYS.prefs);
  return { ...DEFAULT_WORKOUT_CUE_PREFS, ...(stored ?? {}) };
}

export function saveWorkoutCuePrefs(prefs: WorkoutCuePrefs): Promise<void> {
  return writeJson(KEYS.prefs, prefs);
}

// ── last quick goal (prefill next time) ─────────────────────────────────────

export function saveLastQuickGoal(goal: WorkoutGoal): Promise<void> {
  return writeJson(KEYS.lastGoal, goal);
}

export function loadLastQuickGoal(): Promise<WorkoutGoal | null> {
  return readJson<WorkoutGoal>(KEYS.lastGoal);
}

// ── scheduled goal notification id ──────────────────────────────────────────

export async function saveGoalNotificationId(id: string | null): Promise<void> {
  try {
    if (id) await AsyncStorage.setItem(KEYS.notification, id);
    else await AsyncStorage.removeItem(KEYS.notification);
  } catch {
    // ignore
  }
}

export async function loadGoalNotificationId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.notification);
  } catch {
    return null;
  }
}
