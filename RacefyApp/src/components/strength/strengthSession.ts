import type { TFunction } from 'i18next';
import type {
  StrengthExercise,
  StrengthHighlight,
  StrengthProgress,
  StrengthSessionSummary,
  StrengthSet,
  StrengthSetValue,
} from '../../types/api';

/**
 * Helpers for `activity.strength_session`, shared by the feed card, the post
 * card and the activity screen. Mirror of the web SPA's
 * `components/workouts/strength/strengthSession.js` — keep the two in step.
 *
 * Series colours are returned as an index into `colors.series` (theme), so the
 * components pick the light or dark value.
 */

/** A session worth drawing: the API can send one with no exercises. */
export function hasStrengthSession(
  session: StrengthSessionSummary | null | undefined,
): session is StrengthSessionSummary {
  return !!session && Array.isArray(session.exercises) && session.exercises.length > 0;
}

/** 55 → "55", 17.5 → "17,5" in pl, "17.5" in en. */
export function formatKg(value: number | null | undefined, locale?: string): string {
  if (value == null) return '—';
  return Number(value).toLocaleString(locale, { maximumFractionDigits: 2 });
}

/** 5912 → "5 912" / "5,912" (whatever the locale groups). */
export function formatVolume(value: number | null | undefined, locale?: string): string {
  return Math.round(Number(value) || 0).toLocaleString(locale);
}

/** "55×8", "45 s", "20" (bodyweight) — one set as it reads on a tile. */
export function setLabel(set: StrengthSetValue | null | undefined, locale?: string): string {
  if (!set) return '—';
  if (set.weight_kg != null && set.reps != null)
    return `${formatKg(set.weight_kg, locale)}×${set.reps}`;
  if (set.duration_seconds != null) return `${set.duration_seconds} s`;
  if (set.reps != null) return String(set.reps);
  return '—';
}

/** "55 kg × 8", "45 s", "× 20" — the longer form on the exercise cards. */
export function setDetailLabel(set: StrengthSetValue, locale?: string): string {
  if (set.weight_kg != null && set.reps != null)
    return `${formatKg(set.weight_kg, locale)} kg × ${set.reps}`;
  if (set.duration_seconds != null) {
    return set.weight_kg != null
      ? `${formatKg(set.weight_kg, locale)} kg · ${set.duration_seconds} s`
      : `${set.duration_seconds} s`;
  }
  if (set.reps != null) return `× ${set.reps}`;
  return '—';
}

/** A completed set heavier than the exercise's best set last time. */
export function isHeavierThanLastTime(set: StrengthSet, exercise: StrengthExercise): boolean {
  const previous = exercise.previous?.best_set?.weight_kg;
  return set.is_completed && set.weight_kg != null && previous != null && set.weight_kg > previous;
}

export function isSkippedExercise(exercise: StrengthExercise): boolean {
  return exercise.sets_completed === 0;
}

export interface VolumeShare {
  exercise: StrengthExercise;
  share: number;
  colorIndex: number;
}

/**
 * Completed exercises with their share of the session volume and a series
 * colour, biggest first. Bodyweight / timed exercises (0 kg) are left out.
 */
export function volumeShares(session: StrengthSessionSummary): VolumeShare[] {
  const total = session.stats?.volume_kg || 0;
  return session.exercises
    .filter((e) => e.volume_kg > 0)
    .sort((a, b) => b.volume_kg - a.volume_kg)
    .map((exercise, i) => ({
      exercise,
      share: total > 0 ? exercise.volume_kg / total : 0,
      colorIndex: i,
    }));
}

/** 0.2987 → 30 */
export function percent(share: number): number {
  return Math.round(share * 100);
}

/** Exercises with nothing completed — shown dashed, never as a failure. */
export function skippedExercises(session: StrengthSessionSummary): StrengthExercise[] {
  return session.exercises.filter(isSkippedExercise);
}

export type RhythmItem =
  | { kind: 'separator'; key: string }
  | { kind: 'set'; key: string; set: StrengthSet; colorIndex: number }
  | { kind: 'rest'; key: string; seconds: number | null };

/**
 * Sets and the rests between them, in order, for the rhythm strip.
 * A rest of unknown length is a narrow gap with no label.
 */
export function rhythmItems(session: StrengthSessionSummary): {
  items: RhythmItem[];
  legend: { name: string; colorIndex: number }[];
} {
  const items: RhythmItem[] = [];
  const done = session.exercises.filter((e) => e.sets_completed > 0);
  done.forEach((exercise, ei) => {
    if (ei > 0) items.push({ kind: 'separator', key: `sep-${exercise.exercise_order}` });
    const sets = exercise.sets.filter((s) => s.is_completed);
    sets.forEach((set, si) => {
      items.push({
        kind: 'set',
        key: `set-${exercise.exercise_order}-${set.set_number}`,
        set,
        colorIndex: ei,
      });
      if (si < sets.length - 1) {
        items.push({
          kind: 'rest',
          key: `rest-${exercise.exercise_order}-${set.set_number}`,
          seconds: set.rest_seconds,
        });
      }
    });
  });
  return { items, legend: done.map((e, i) => ({ name: e.name, colorIndex: i })) };
}

/** Flex weight of a rest bar next to a set block (weight 2). */
export function restFlex(seconds: number | null): number {
  return seconds ? seconds / 40 : 0.4;
}

/** "+5 kg", "+3 powt.", "+15 s" — the improvement a highlight stands for. */
export function highlightDelta(
  highlight: StrengthHighlight,
  t: TFunction,
  locale?: string,
): string {
  if (highlight.type === 'weight') return `+${formatKg(highlight.weight_delta_kg, locale)} kg`;
  if (highlight.type === 'reps') {
    return t('activities.strength.repsDelta', { count: highlight.reps_delta });
  }
  return `+${highlight.duration_delta_seconds} s`;
}

export type ProgressTone = 'up' | 'down' | 'same';

/** "+5 kg" / "−2 powt." / "=" and whether it went up, down or nowhere. */
export function progressDelta(
  progress: StrengthProgress,
  t: TFunction,
  locale?: string,
): { text: string; tone: ProgressTone } {
  const { weight_delta_kg: w, reps_delta: r, duration_delta_seconds: d } = progress;
  const up = w > 0 || r > 0 || d > 0;
  const down = w < 0 || (w === 0 && (r < 0 || d < 0));
  let text = '=';
  if (w !== 0) text = `${w > 0 ? '+' : '−'}${formatKg(Math.abs(w), locale)} kg`;
  else if (r !== 0) {
    text = t('activities.strength.repsDeltaSigned', {
      sign: r > 0 ? '+' : '−',
      count: Math.abs(r),
    });
  } else if (d !== 0) text = `${d > 0 ? '+' : '−'}${Math.abs(d)} s`;
  return { text, tone: up ? 'up' : down ? 'down' : 'same' };
}

/** Exercises that can be compared against last time. */
export function comparedExercises(session: StrengthSessionSummary): StrengthExercise[] {
  return session.exercises.filter((e) => e.progress && e.best_set && e.previous?.best_set);
}

/** Best weight above the plan's suggestion, or null. */
export function overPlanKg(exercise: StrengthExercise): number | null {
  const best = exercise.best_set?.weight_kg;
  const suggested = exercise.planned.suggested_weight_kg;
  return best != null && suggested != null && best > suggested ? best - suggested : null;
}

export interface StrengthMetric {
  key: string;
  label: string;
  value: string;
  unit?: string;
}

/**
 * The metric strip: duration · sets · exercises · RPE on the feed card; the
 * activity screen puts the volume in front (`withVolume`).
 */
export function strengthMetrics(
  session: StrengthSessionSummary,
  durationSeconds: number | null | undefined,
  opts: {
    withVolume?: boolean;
    formatDuration: (s: number) => string;
    t: TFunction;
    locale?: string;
  },
): StrengthMetric[] {
  const { t, locale } = opts;
  const items: StrengthMetric[] = [];
  if (opts.withVolume) {
    items.push({
      key: 'volume',
      label: t('activities.strength.volume'),
      value: formatVolume(session.stats.volume_kg, locale),
      unit: 'kg',
    });
  }
  if (durationSeconds && durationSeconds > 0) {
    items.push({
      key: 'duration',
      label: t('activities.strength.duration'),
      value: opts.formatDuration(durationSeconds),
    });
  }
  items.push({
    key: 'sets',
    label: t('activities.strength.setsLabel'),
    value: String(session.stats.sets_completed),
    unit: `/${session.stats.sets_total}`,
  });
  items.push({
    key: 'exercises',
    label: t('activities.strength.exercisesLabel'),
    value: String(session.stats.exercises_completed),
    unit: `/${session.stats.exercises}`,
  });
  if (session.rpe != null) {
    items.push({
      key: 'rpe',
      label: t('activities.strength.rpe'),
      value: String(session.rpe),
      unit: '/10',
    });
  }
  return items;
}

/**
 * The activity's auto description is the session's sets as prose — the strength
 * panel shows the same thing, so the text is hidden when it is just that. The
 * feed post keeps a text of its own only when it differs from the description.
 */
export function isAutoStrengthText(
  text: string | null | undefined,
  description: string | null | undefined,
): boolean {
  return text == null || text === '' || text === description;
}
