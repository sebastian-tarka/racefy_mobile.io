import type { TFunction } from 'i18next';
import type {
  Weekday,
  WorkoutExercise,
  WorkoutExerciseInput,
  WorkoutTargetType,
} from '../types/workouts';

type PrescriptionLike = Pick<
  WorkoutExercise | WorkoutExerciseInput,
  'sets' | 'target_type' | 'reps_min' | 'reps_max' | 'rest_seconds'
>;

/** "6–10", "45–60 s", "12", "max". */
export function formatTarget(
  targetType: WorkoutTargetType | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
  t: TFunction,
): string {
  const type = targetType ?? 'reps';
  if (type === 'amrap') return t('strengthPlans.target.amrap');
  const lo = min ?? max;
  const hi = max ?? min;
  let range: string;
  if (lo == null && hi == null) range = '—';
  else if (lo === hi || hi == null) range = String(lo);
  else if (lo == null) range = String(hi);
  else range = `${lo}–${hi}`;
  return type === 'seconds' ? `${range} ${t('strengthPlans.secondsShort')}` : range;
}

/** "4 × 6–10 · 120 s" — the whole prescription in one breath. */
export function formatPrescription(row: PrescriptionLike, t: TFunction): string {
  const target = formatTarget(row.target_type, row.reps_min, row.reps_max, t);
  const head = `${row.sets} × ${target}`;
  const rest = row.rest_seconds;
  return rest != null && rest > 0 ? `${head} · ${formatRest(rest, t)}` : head;
}

/** "120 s", "1:30" for odd values above a minute stays in seconds — coaches read "90 s". */
export function formatRest(seconds: number, t: TFunction): string {
  return `${seconds} ${t('strengthPlans.secondsShort')}`;
}

/** Short weekday label from i18n ("Mon" / "Pn"). */
export function weekdayShort(weekday: Weekday, t: TFunction): string {
  return t(`strengthPlans.weekdaysShort.${weekday}`);
}

export function weekdayLong(weekday: Weekday, t: TFunction): string {
  return t(`strengthPlans.weekdays.${weekday}`);
}

/** "~45 min" */
export function formatDurationMinutes(minutes: number | null | undefined, t: TFunction): string {
  if (!minutes) return '';
  return t('strengthPlans.durationMinutes', { minutes });
}
