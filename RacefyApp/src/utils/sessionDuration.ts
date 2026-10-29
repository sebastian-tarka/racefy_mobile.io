import type { WorkoutSession } from '../types/workouts';

/**
 * Longest duration the API logs a strength session with (12h). Mirrors
 * `WorkoutSessionService::MAX_DURATION_SECONDS` and the web SPA's
 * `MAX_SESSION_DURATION_SECONDS`.
 */
export const MAX_SESSION_DURATION_SECONDS = 43200;

/**
 * Past this the session clock most likely kept running after the workout
 * (left open overnight), so the finish sheet asks for the real duration.
 */
export const LONG_SESSION_SECONDS = 4 * 3600;

/**
 * Seconds from the first set touched to the last set completed — the time
 * actually spent working. Null when no set carries a timestamp.
 */
export function setsSpanSeconds(session: Pick<WorkoutSession, 'exercises'> | null): number | null {
  let first = Infinity;
  let last = -Infinity;
  for (const ex of session?.exercises ?? []) {
    for (const set of ex.sets) {
      for (const stamp of [set.started_at, set.completed_at]) {
        const ms = stamp ? new Date(stamp).getTime() : NaN;
        if (Number.isFinite(ms)) first = Math.min(first, ms);
      }
      const done = set.completed_at ? new Date(set.completed_at).getTime() : NaN;
      if (Number.isFinite(done)) last = Math.max(last, done);
    }
  }
  if (!Number.isFinite(first) || !Number.isFinite(last) || last <= first) return null;
  return Math.round((last - first) / 1000);
}

/**
 * What to prefill the duration with when the clock overran: the sets' span
 * when it fits under the cap, else nothing — the athlete types it in.
 */
export function overrunDurationSuggestion(
  session: Pick<WorkoutSession, 'exercises'> | null,
): number | null {
  const span = setsSpanSeconds(session);
  return span != null && span <= MAX_SESSION_DURATION_SECONDS ? span : null;
}
