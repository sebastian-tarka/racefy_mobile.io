import type { Ionicons } from '@expo/vector-icons';
import type { TrainingProgram, TrainingWeek } from '../types/api';

/** One session row of a training week, whatever the API sent it as. */
export interface UISession {
  id: string;
  title: string;
  detail: string;
  durationMinutes: number;
  status: 'completed' | 'skipped' | 'pending';
  iconType: string;
  /** Per-session discipline; only set on multi-sport (triathlon) plans. */
  sportSlug?: string | null;
}

export type DistanceFormatter = (meters: number) => string;

export function humanize(text: string): string {
  if (!text) return '';
  const s = text.replace(/[_-]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Normalize a week's sessions into a single list. Prefers `activities` (they carry a
 * completion status → DONE/PLANNED); falls back to the prescribed `suggested_activities`
 * (always shown as planned) when no concrete activities exist yet.
 */
export function getSessions(week: TrainingWeek, fmtDist: DistanceFormatter): UISession[] {
  const acts = week.activities || [];
  if (acts.length > 0) {
    return acts.map((a) => ({
      id: `a-${a.id}`,
      title: humanize(a.description || a.activity_type),
      detail: [a.distance_meters ? fmtDist(a.distance_meters) : null, a.intensity]
        .filter(Boolean)
        .join(' · '),
      durationMinutes: a.duration_minutes || 0,
      status: a.status,
      iconType: a.activity_type,
    }));
  }
  const suggested = week.suggested_activities || [];
  return suggested.map((s) => ({
    id: `s-${s.id}`,
    title: humanize(s.activity_type),
    detail: [
      s.target_distance_meters ? fmtDist(s.target_distance_meters) : null,
      s.intensity_description,
    ]
      .filter(Boolean)
      .join(' · '),
    durationMinutes: s.target_duration_minutes || 0,
    status: 'pending' as const,
    iconType: s.activity_type,
    sportSlug: s.sport_slug,
  }));
}

/** Completed / total sessions, planned minutes and percent for a week. */
export function weekStats(week: TrainingWeek, fmtDist: DistanceFormatter) {
  const sessions = getSessions(week, fmtDist);
  const statusCompleted = sessions.filter((s) => s.status === 'completed').length;
  // The backend exposes completed/planned counts in `progress` (derived from
  // activity matching). Prefer them so the card matches the week-progress
  // (compliance) screen even when per-session status isn't set on auto-linked runs.
  const completed = Math.max(statusCompleted, week.progress?.activities_count ?? 0);
  const total =
    week.progress?.suggested_activities_count ||
    week.progress?.sessions_per_week ||
    sessions.length;
  const plannedMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return { sessions, completed, total, plannedMinutes, percent };
}

/**
 * Completed vs planned sessions across every week that has started (computed
 * client-side), in percent; null before anything was planned.
 */
export function programAdherence(weeks: TrainingWeek[], fmtDist: DistanceFormatter): number | null {
  let done = 0;
  let planned = 0;
  weeks.forEach((w) => {
    if (w.status === 'upcoming') return;
    const s = weekStats(w, fmtDist);
    done += s.completed;
    planned += s.total;
  });
  return planned > 0 ? Math.round((done / planned) * 100) : null;
}

/** Weeks behind / ahead and the overall percent of a programme. */
export function programProgress(
  program: Pick<TrainingProgram, 'total_weeks' | 'current_week_number'>,
) {
  const totalWeeks = program.total_weeks || 0;
  const currentWeekNumber = program.current_week_number ?? 0;
  const weeksDone = Math.max(0, currentWeekNumber - 1);
  const toGo = Math.max(0, totalWeeks - weeksDone);
  const overallPercent =
    totalWeeks > 0 ? Math.min(100, Math.round((weeksDone / totalWeeks) * 100)) : 0;
  return { totalWeeks, currentWeekNumber, weeksDone, toGo, overallPercent };
}

/** The week shown by default: the current one, else the first. */
export function defaultWeek(weeks: TrainingWeek[]): TrainingWeek | null {
  return weeks.find((w) => w.status === 'current' || w.status === 'active') ?? weeks[0] ?? null;
}

/**
 * `sportSlug` is the session's own discipline and is authoritative when present
 * — in a triathlon plan one week mixes swims, rides and runs, which the
 * name-sniffing fallback below cannot reliably tell apart.
 */
export function activityIcon(
  type: string,
  sportSlug?: string | null,
): keyof typeof Ionicons.glyphMap {
  const slug = (sportSlug || '').toLowerCase();
  if (slug.includes('swim')) return 'water';
  if (slug.includes('cycl') || slug.includes('bike')) return 'bicycle';
  if (slug.includes('run') || slug.includes('walk')) return 'walk';

  const t = (type || '').toLowerCase();
  if (t.includes('rest')) return 'bed-outline';
  if (t.includes('hill') || t.includes('interval') || t.includes('tempo') || t.includes('speed'))
    return 'flame';
  if (t.includes('bike') || t.includes('cycl') || t.includes('cross')) return 'bicycle';
  if (t.includes('swim')) return 'water';
  return 'walk';
}
