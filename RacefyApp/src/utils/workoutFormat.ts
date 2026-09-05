import type { TFunction } from 'i18next';
import type {
  SegmentProgress,
  SegmentRemaining,
  WorkoutEngineState,
} from '../services/workout/engine';
import type { CompiledSegment, WorkoutGoal, WorkoutPlan, WorkoutStepEnd } from '../types/workout';
import { formatTime } from './formatters';

type FormatDistance = (meters: number) => string;

/** "25:00" / "1:05:00" — same clock format as the recording timer. */
export function formatGoalTime(seconds: number): string {
  return formatTime(Math.round(seconds));
}

/**
 * Short label for chips and card headers: "5 km", "3.1 mi", "30:00".
 * `formatDistance` is the units-aware formatter from `useUnits()`.
 */
export function formatGoalShort(goal: WorkoutGoal, formatDistance: FormatDistance): string {
  return goal.type === 'time' ? formatGoalTime(goal.seconds) : formatDistance(goal.meters);
}

export function formatRemainingShort(
  remaining: SegmentRemaining,
  formatDistance: FormatDistance,
): string {
  return remaining.type === 'time'
    ? formatGoalTime(remaining.seconds)
    : formatDistance(remaining.meters);
}

/**
 * A step length the way a coach writes it: "400 m", "1 min", "90 s", "5:30".
 * `t` supplies the unit words.
 */
export function formatStepEnd(
  end: WorkoutStepEnd,
  formatDistance: FormatDistance,
  t: TFunction,
): string {
  if (end.type === 'distance') return formatDistance(end.meters);
  if (end.type === 'open') return t('recording.workout.stepOpen');
  const s = end.seconds;
  if (s < 60) return `${s} ${t('recording.workout.secondsShort')}`;
  if (s % 60 === 0) return `${s / 60} ${t('recording.workout.minutesShort')}`;
  return formatGoalTime(s);
}

/** "8 × 400 m / 200 m" — the interval session in one breath. */
export function describeIntervals(
  plan: WorkoutPlan,
  formatDistance: FormatDistance,
  t: TFunction,
): string {
  const repeat = plan.blocks?.find((b) => 'times' in b);
  if (!repeat || !('times' in repeat)) return plan.name;
  const work = repeat.steps.find((s) => s.kind === 'work');
  const rest = repeat.steps.find((s) => s.kind === 'recovery');
  if (!work) return plan.name;
  const head = `${repeat.times} × ${formatStepEnd(work.end, formatDistance, t)}`;
  return rest ? `${head} / ${formatStepEnd(rest.end, formatDistance, t)}` : head;
}

/** Label for a plan as a whole — the goal for quick goals, the session for intervals. */
export function formatPlanLabel(
  plan: WorkoutPlan,
  formatDistance: FormatDistance,
  t?: TFunction,
): string {
  if (plan.mode === 'goal' && plan.goal) return formatGoalShort(plan.goal, formatDistance);
  if (plan.mode === 'intervals' && t) return describeIntervals(plan, formatDistance, t);
  return plan.name;
}

/** "WARM-UP", "REP 3/8", "RECOVERY 3/8", "COOL-DOWN" (not upper-cased here). */
export function segmentTitle(segment: CompiledSegment, t: TFunction): string {
  const rl = segment.repeatLabel;
  switch (segment.kind) {
    case 'warmup':
      return t('recording.workout.segWarmup');
    case 'cooldown':
      return t('recording.workout.segCooldown');
    case 'work':
      return rl
        ? t('recording.workout.segRep', { current: rl.current, total: rl.total })
        : t('recording.workout.segWork');
    case 'recovery':
      return rl
        ? `${t('recording.workout.segRecovery')} ${rl.current}/${rl.total}`
        : t('recording.workout.segRecovery');
  }
}

/** Relative width of a segment in the plan strip — seconds, or metres at 6:00/km. */
export function segmentWeight(segment: CompiledSegment): number {
  if (segment.end.type === 'time') return segment.end.seconds;
  if (segment.end.type === 'distance') return segment.end.meters * 0.36;
  return 120;
}

/**
 * One-line status for the lock overlay and the map controls:
 * "GOAL · 5 KM · 1.8 km to go" / "REP 3/8 · 0:47 → 200 m recovery" / "PLAN COMPLETE".
 */
export function workoutStatusLine(
  plan: WorkoutPlan,
  progress: SegmentProgress | null,
  state: WorkoutEngineState | null,
  formatDistance: FormatDistance,
  t: TFunction,
): string {
  if (plan.mode === 'goal' && plan.goal) {
    const goal = formatGoalShort(plan.goal, formatDistance);
    if (progress?.overshoot) return t('recording.workout.reached');
    const remaining = progress?.remaining
      ? t('recording.workout.remaining', {
          value: formatRemainingShort(progress.remaining, formatDistance),
        })
      : '';
    return `${t('recording.workout.goalLabel', { goal })} · ${remaining}`;
  }
  if (!progress || !state) return plan.name;
  if (progress.overshoot) return t('recording.workout.planComplete');
  const title = segmentTitle(progress.segment, t);
  const left = progress.remaining
    ? formatRemainingShort(progress.remaining, formatDistance)
    : t('recording.workout.stepOpen');
  const next = state.segments[progress.segment.index + 1];
  const nextText = next
    ? ` → ${formatStepEnd(next.end, formatDistance, t)} ${segmentTitle(next, t).toLowerCase()}`
    : '';
  return `${title} · ${left}${nextText}`;
}
