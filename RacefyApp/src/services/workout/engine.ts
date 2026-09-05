/**
 * Workout engine — a pure reducer over "where is the athlete now".
 *
 * No React, no timers, no I/O: the foreground hook feeds it the active timer
 * and GPS distance on every tick, the headless background task feeds it the
 * same numbers reconstructed from storage, and both get back the SAME events
 * for the same inputs. Idempotency lives in `firedKeys`: a key that has fired
 * never fires again, no matter which context asks — that is what stops the
 * foreground and background from both announcing "goal reached".
 *
 * Time is ACTIVE time (the recording timer, which excludes pauses), so a
 * pause simply freezes every time-based segment. Distance is the cumulative
 * recorded distance in metres.
 */

import type { CompiledSegment, WorkoutPlan, WorkoutStepEnd } from '../../types/workout';
import { compileWorkout } from './compile';

export interface EngineSnapshot {
  activeSeconds: number;
  distanceM: number;
}

export interface WorkoutEngineState {
  planId: string;
  mode: WorkoutPlan['mode'];
  segments: CompiledSegment[];
  currentIndex: number;
  /** Snapshot taken when the current segment began. */
  segmentStart: EngineSnapshot;
  /**
   * The previous snapshot fed to `advanceWorkout`. When one tick jumps over a
   * boundary (app was in background), the boundary's other dimension is
   * interpolated between this and the new snapshot instead of guessed.
   */
  lastSnapshot: EngineSnapshot;
  firedKeys: string[];
  completed: boolean;
  /** Snapshot at the moment the last segment ended. */
  completedAt?: EngineSnapshot;
}

export type WorkoutEngineEvent =
  /** A segment other than the first one began. `next` is the one after it, if any. */
  | { type: 'segment_start'; segment: CompiledSegment; next?: CompiledSegment }
  /** 3 / 2 / 1 seconds left in a time-based segment that has a successor. */
  | { type: 'countdown'; secondsLeft: 1 | 2 | 3; next: CompiledSegment }
  /** ~100 m left in a distance-based segment that has a successor. */
  | { type: 'approach'; metersLeft: number; next: CompiledSegment }
  /** Half of a simple goal covered. */
  | { type: 'halfway'; remaining: SegmentRemaining }
  /** A simple goal has been met. The recording keeps going. */
  | { type: 'goal_reached'; at: EngineSnapshot }
  /** The last segment of an interval session ended. */
  | { type: 'workout_complete'; at: EngineSnapshot };

export interface AdvanceResult {
  state: WorkoutEngineState;
  events: WorkoutEngineEvent[];
}

/** What is left of a segment, in the dimension it is measured in. */
export type SegmentRemaining =
  | { type: 'time'; seconds: number }
  | { type: 'distance'; meters: number };

export interface SegmentProgress {
  segment: CompiledSegment;
  /** Elapsed within the current segment. */
  elapsed: EngineSnapshot;
  /** What is left of the current segment; null for `open` segments. */
  remaining: SegmentRemaining | null;
  /** 0..1 within the segment; 0 for `open`. Clamped — overshoot is exposed separately. */
  fraction: number;
  /** How far past the end of the final segment the athlete is (goal mode after the goal). */
  overshoot: EngineSnapshot | null;
}

/** Distance before a boundary at which the "approach" cue fires. */
export const APPROACH_METERS = 100;

export function createWorkoutEngine(plan: WorkoutPlan, start: EngineSnapshot): WorkoutEngineState {
  return {
    planId: plan.id,
    mode: plan.mode,
    segments: compileWorkout(plan),
    currentIndex: 0,
    segmentStart: { ...start },
    lastSnapshot: { ...start },
    firedKeys: [],
    completed: false,
  };
}

function elapsedIn(state: WorkoutEngineState, now: EngineSnapshot): EngineSnapshot {
  return {
    activeSeconds: Math.max(0, now.activeSeconds - state.segmentStart.activeSeconds),
    distanceM: Math.max(0, now.distanceM - state.segmentStart.distanceM),
  };
}

function isSegmentDone(end: WorkoutStepEnd, elapsed: EngineSnapshot): boolean {
  if (end.type === 'time') return elapsed.activeSeconds >= end.seconds;
  if (end.type === 'distance') return elapsed.distanceM >= end.meters;
  return false;
}

function fire(state: WorkoutEngineState, key: string): boolean {
  if (state.firedKeys.includes(key)) return false;
  state.firedKeys.push(key);
  return true;
}

/**
 * Feed a new snapshot. Returns the new state plus every event that became due
 * since the last call, in the order they should be announced. Safe to call as
 * often as you like — identical or older snapshots produce no events.
 */
export function advanceWorkout(prev: WorkoutEngineState, now: EngineSnapshot): AdvanceResult {
  if (prev.completed || prev.segments.length === 0) return { state: prev, events: [] };

  // Work on a copy so callers can keep the previous state (React, tests).
  const state: WorkoutEngineState = { ...prev, firedKeys: [...prev.firedKeys] };
  const events: WorkoutEngineEvent[] = [];
  // Where the athlete was before this tick — the start of the interpolation
  // line for any boundary crossed during it.
  let from = prev.lastSnapshot;

  // A segment can be shorter than one tick (e.g. a 5 s step while the app was
  // backgrounded), so loop until the snapshot no longer completes the current one.
  for (let guard = 0; guard < state.segments.length + 1; guard++) {
    const segment = state.segments[state.currentIndex];
    const next = state.segments[state.currentIndex + 1];
    const elapsed = elapsedIn(state, now);

    // Pre-boundary cues only make sense when there is something to switch to.
    if (next) {
      if (segment.end.type === 'time') {
        const left = segment.end.seconds - elapsed.activeSeconds;
        for (const n of [3, 2, 1] as const) {
          // Fire the countdown step once its second arrives, but never after
          // the segment already ended — a stale background snapshot must not
          // blurt "3, 2, 1" on top of the boundary announcement.
          if (left <= n && left > 0 && fire(state, `seg:${segment.index}:cd:${n}`)) {
            events.push({ type: 'countdown', secondsLeft: n, next });
          }
        }
      } else if (segment.end.type === 'distance') {
        const left = segment.end.meters - elapsed.distanceM;
        if (
          segment.end.meters > APPROACH_METERS * 2 &&
          left <= APPROACH_METERS &&
          left > 0 &&
          fire(state, `seg:${segment.index}:approach`)
        ) {
          events.push({ type: 'approach', metersLeft: Math.round(left), next });
        }
      }
    }

    // Halfway — simple goals only (an interval athlete hears boundaries, not halves).
    if (state.mode === 'goal' && !next) {
      const half = halfwayReached(segment.end, elapsed);
      if (half && fire(state, 'goal:half')) {
        events.push({ type: 'halfway', remaining: remainingOf(segment.end, elapsed) });
      }
    }

    if (!isSegmentDone(segment.end, elapsed)) break;

    // Segment finished. Its end is the next one's start — carried over exactly
    // (not the current snapshot) so a slow tick does not steal time from the
    // following segment.
    const boundary = boundarySnapshot(state.segmentStart, segment.end, from, now);
    from = boundary;

    if (!next) {
      state.completed = true;
      state.completedAt = boundary;
      if (state.mode === 'goal') {
        if (fire(state, 'goal:reached')) events.push({ type: 'goal_reached', at: boundary });
      } else if (fire(state, 'workout:complete')) {
        events.push({ type: 'workout_complete', at: boundary });
      }
      break;
    }

    state.currentIndex += 1;
    state.segmentStart = boundary;
    if (fire(state, `seg:${next.index}:start`)) {
      events.push({
        type: 'segment_start',
        segment: next,
        next: state.segments[state.currentIndex + 1],
      });
    }
  }

  state.lastSnapshot = { ...now };
  return { state, events };
}

/**
 * End the current segment now ("Lap" / "next"). Works for `open` segments and
 * for cutting a timed one short. No pre-boundary cues are emitted for a skip.
 */
export function skipWorkoutSegment(prev: WorkoutEngineState, now: EngineSnapshot): AdvanceResult {
  if (prev.completed || prev.segments.length === 0) return { state: prev, events: [] };

  const state: WorkoutEngineState = { ...prev, firedKeys: [...prev.firedKeys] };
  const events: WorkoutEngineEvent[] = [];
  const segment = state.segments[state.currentIndex];
  const next = state.segments[state.currentIndex + 1];

  // Suppress any pending pre-boundary cues for the segment being skipped.
  fire(state, `seg:${segment.index}:approach`);
  for (const n of [3, 2, 1]) fire(state, `seg:${segment.index}:cd:${n}`);

  const at = { ...now };
  state.lastSnapshot = at;
  if (!next) {
    state.completed = true;
    state.completedAt = at;
    if (state.mode === 'goal') {
      if (fire(state, 'goal:reached')) events.push({ type: 'goal_reached', at });
    } else if (fire(state, 'workout:complete')) {
      events.push({ type: 'workout_complete', at });
    }
    return { state, events };
  }

  state.currentIndex += 1;
  state.segmentStart = at;
  if (fire(state, `seg:${next.index}:start`)) {
    events.push({
      type: 'segment_start',
      segment: next,
      next: state.segments[state.currentIndex + 1],
    });
  }
  return { state, events };
}

/**
 * Replace everything from the current segment onward (in-run edit). Completed
 * segments and their fired keys are kept; the current segment restarts its
 * pre-boundary cues only if its definition changed.
 */
export function replaceWorkoutFromCurrent(
  prev: WorkoutEngineState,
  segmentsFromCurrent: CompiledSegment[],
): WorkoutEngineState {
  const done = prev.segments.slice(0, prev.currentIndex);
  const renumbered = segmentsFromCurrent.map((s, i) => ({ ...s, index: done.length + i }));
  const segments = [...done, ...renumbered];
  const currentIdx = Math.min(prev.currentIndex, Math.max(0, segments.length - 1));
  return {
    ...prev,
    segments,
    currentIndex: currentIdx,
    completed: segments.length === 0,
    completedAt: segments.length === 0 ? prev.completedAt : undefined,
    firedKeys: prev.firedKeys.filter(
      (k) => !k.startsWith(`seg:${currentIdx}:`) || k.endsWith(':start'),
    ),
  };
}

export function getWorkoutProgress(
  state: WorkoutEngineState,
  now: EngineSnapshot,
): SegmentProgress | null {
  if (state.segments.length === 0) return null;

  if (state.completed) {
    const last = state.segments[state.segments.length - 1];
    const at = state.completedAt ?? state.segmentStart;
    const elapsed = elapsedIn(state, now);
    return {
      segment: last,
      elapsed,
      remaining: last.end.type === 'open' ? null : remainingOf(last.end, elapsed),
      fraction: 1,
      overshoot: {
        activeSeconds: Math.max(0, now.activeSeconds - at.activeSeconds),
        distanceM: Math.max(0, now.distanceM - at.distanceM),
      },
    };
  }

  const segment = state.segments[state.currentIndex];
  const elapsed = elapsedIn(state, now);
  return {
    segment,
    elapsed,
    remaining: segment.end.type === 'open' ? null : remainingOf(segment.end, elapsed),
    fraction: fractionOf(segment.end, elapsed),
    overshoot: null,
  };
}

// ── helpers ────────────────────────────────────────────────────────────────

function halfwayReached(end: WorkoutStepEnd, elapsed: EngineSnapshot): boolean {
  if (end.type === 'time') return elapsed.activeSeconds >= end.seconds / 2;
  if (end.type === 'distance') return elapsed.distanceM >= end.meters / 2;
  return false;
}

function remainingOf(end: WorkoutStepEnd, elapsed: EngineSnapshot): SegmentRemaining {
  if (end.type === 'time') {
    return { type: 'time', seconds: Math.max(0, end.seconds - elapsed.activeSeconds) };
  }
  if (end.type === 'distance') {
    return { type: 'distance', meters: Math.max(0, end.meters - elapsed.distanceM) };
  }
  return { type: 'time', seconds: 0 };
}

function fractionOf(end: WorkoutStepEnd, elapsed: EngineSnapshot): number {
  let f = 0;
  if (end.type === 'time' && end.seconds > 0) f = elapsed.activeSeconds / end.seconds;
  if (end.type === 'distance' && end.meters > 0) f = elapsed.distanceM / end.meters;
  return Math.min(1, Math.max(0, f));
}

/**
 * The exact snapshot at which a segment ended. The dimension the segment is
 * measured in is exact; the other one is interpolated linearly between the
 * previous reading and the current one — a background catch-up that covers
 * three boundaries in one tick still places each of them sensibly.
 */
function boundarySnapshot(
  start: EngineSnapshot,
  end: WorkoutStepEnd,
  from: EngineSnapshot,
  now: EngineSnapshot,
): EngineSnapshot {
  if (end.type === 'time') {
    const t = start.activeSeconds + end.seconds;
    const span = now.activeSeconds - from.activeSeconds;
    const d =
      span > 0
        ? from.distanceM + ((now.distanceM - from.distanceM) * (t - from.activeSeconds)) / span
        : now.distanceM;
    return { activeSeconds: t, distanceM: clamp(d, from.distanceM, now.distanceM) };
  }
  if (end.type === 'distance') {
    const d = start.distanceM + end.meters;
    const span = now.distanceM - from.distanceM;
    const t =
      span > 0
        ? from.activeSeconds +
          ((now.activeSeconds - from.activeSeconds) * (d - from.distanceM)) / span
        : now.activeSeconds;
    return { activeSeconds: clamp(t, from.activeSeconds, now.activeSeconds), distanceM: d };
  }
  return { ...now };
}

function clamp(v: number, lo: number, hi: number): number {
  const min = Math.min(lo, hi);
  const max = Math.max(lo, hi);
  return Math.min(max, Math.max(min, v));
}
