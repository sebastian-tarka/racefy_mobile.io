import type { Activity, ActivityAnalysisSummary } from '../types/api';

/**
 * One-word verdict derived from the effort analysis, shown as a badge on
 * activity cards.
 *
 * It sits before the perceived-effort wording anywhere both appear, because
 * this one comes from the measured track while that one comes from average
 * pace alone.
 */
export type ActivityVerdict =
  | 'strongFinish'
  | 'intervals'
  | 'hardEffort'
  | 'evenPacing'
  | 'fadedFinish';

/**
 * Exactly one verdict, in this priority order — a badge has no room for a
 * caveat, so a low-quality analysis yields none at all rather than an
 * unqualified claim.
 */
export function getActivityVerdict(
  activity: Pick<Activity, 'analysis_summary'> | null | undefined,
): ActivityVerdict | null {
  // Absent (relation not loaded) and null (nothing computed) are the same case.
  const summary: ActivityAnalysisSummary | null | undefined = activity?.analysis_summary;
  if (!summary || summary.quality === 'low') return null;

  if (summary.pacing_split === 'negative') return 'strongFinish';
  if (summary.phase_types?.includes('intervals')) return 'intervals';
  if (summary.phase_types?.includes('peak')) return 'hardEffort';
  if (summary.featureless) return 'evenPacing';
  if (summary.pacing_split === 'positive') return 'fadedFinish';

  return null;
}

/** Badge colours, keyed by verdict. Same hues in light and dark; alpha differs. */
export const VERDICT_COLORS: Record<ActivityVerdict, string> = {
  strongFinish: '#10b981', // emerald
  intervals: '#8b5cf6', // violet
  hardEffort: '#f59e0b', // amber
  evenPacing: '#0ea5e9', // sky
  fadedFinish: '#9ca3af', // gray
};
