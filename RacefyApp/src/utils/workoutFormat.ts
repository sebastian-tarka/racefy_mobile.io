import type { SegmentRemaining } from '../services/workout/engine';
import type { WorkoutGoal, WorkoutPlan } from '../types/workout';
import { formatTime } from './formatters';

/** "25:00" / "1:05:00" — same clock format as the recording timer. */
export function formatGoalTime(seconds: number): string {
  return formatTime(Math.round(seconds));
}

/**
 * Short label for chips and card headers: "5 km", "3.1 mi", "30:00".
 * `formatDistance` is the units-aware formatter from `useUnits()`.
 */
export function formatGoalShort(goal: WorkoutGoal, formatDistance: (m: number) => string): string {
  return goal.type === 'time' ? formatGoalTime(goal.seconds) : formatDistance(goal.meters);
}

export function formatRemainingShort(
  remaining: SegmentRemaining,
  formatDistance: (m: number) => string,
): string {
  return remaining.type === 'time'
    ? formatGoalTime(remaining.seconds)
    : formatDistance(remaining.meters);
}

/** Label for a plan as a whole — the goal for quick goals, the name otherwise. */
export function formatPlanLabel(plan: WorkoutPlan, formatDistance: (m: number) => string): string {
  if (plan.mode === 'goal' && plan.goal) return formatGoalShort(plan.goal, formatDistance);
  return plan.name;
}
