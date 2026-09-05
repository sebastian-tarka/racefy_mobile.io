import type { CompiledSegment, WorkoutGoal, WorkoutPlan, WorkoutStep } from '../../types/workout';
import { isWorkoutRepeat } from '../../types/workout';

/** Fallback pace used to estimate a time for distance-based steps (6:00 min/km). */
const DEFAULT_PACE_SEC_PER_KM = 360;

/**
 * Flatten a plan into the segment list the engine runs through. A simple goal
 * becomes a single `work` segment; repeats are expanded and numbered.
 */
export function compileWorkout(plan: WorkoutPlan): CompiledSegment[] {
  if (plan.mode === 'goal') {
    if (!plan.goal) return [];
    return [{ index: 0, kind: 'work', end: goalToEnd(plan.goal) }];
  }

  const segments: CompiledSegment[] = [];
  const push = (step: WorkoutStep, repeatLabel?: CompiledSegment['repeatLabel']) => {
    segments.push({ index: segments.length, kind: step.kind, end: step.end, repeatLabel });
  };

  for (const block of plan.blocks ?? []) {
    if (isWorkoutRepeat(block)) {
      const times = Math.max(1, Math.floor(block.times));
      for (let i = 1; i <= times; i++) {
        for (const step of block.steps) push(step, { current: i, total: times });
      }
    } else {
      push(block);
    }
  }
  return segments;
}

function goalToEnd(goal: WorkoutGoal): CompiledSegment['end'] {
  return goal.type === 'time'
    ? { type: 'time', seconds: goal.seconds }
    : { type: 'distance', meters: goal.meters };
}

export interface WorkoutTotals {
  /** Estimated active time, seconds. Open segments count as 0. */
  seconds: number;
  /** Estimated distance, metres. Time segments are converted with `paceSecPerKm`. */
  meters: number;
  /** True when any segment is `open` — totals are then a lower bound. */
  hasOpen: boolean;
}

/**
 * Rough totals for the "≈ 32 min · 6.4 km" line in the configurator. Uses the
 * athlete's typical pace when known so a 10 × 1 km session doesn't read as 20 min.
 */
export function estimateWorkoutTotals(
  plan: WorkoutPlan,
  paceSecPerKm: number = DEFAULT_PACE_SEC_PER_KM,
): WorkoutTotals {
  const pace = paceSecPerKm > 0 ? paceSecPerKm : DEFAULT_PACE_SEC_PER_KM;
  let seconds = 0;
  let meters = 0;
  let hasOpen = false;

  for (const segment of compileWorkout(plan)) {
    if (segment.end.type === 'time') {
      seconds += segment.end.seconds;
      meters += (segment.end.seconds / pace) * 1000;
    } else if (segment.end.type === 'distance') {
      meters += segment.end.meters;
      seconds += (segment.end.meters / 1000) * pace;
    } else {
      hasOpen = true;
    }
  }

  return { seconds: Math.round(seconds), meters: Math.round(meters), hasOpen };
}

/** Stable id for ad-hoc plans; no crypto needed, uniqueness within one device is enough. */
export function newWorkoutId(prefix = 'w'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function makeQuickGoalPlan(goal: WorkoutGoal, sportTypeId?: number): WorkoutPlan {
  return {
    id: newWorkoutId('goal'),
    name: '',
    mode: 'goal',
    goal,
    source: 'quick',
    sportTypeId,
  };
}
