import type { WorkoutSession } from '../types/workouts';

/**
 * Longest duration the API logs a strength session with (12h). Mirrors
 * `WorkoutSessionService::MAX_DURATION_SECONDS` and the web SPA's
 * `MAX_SESSION_DURATION_SECONDS`.
 */
export const MAX_SESSION_DURATION_SECONDS = 43200;

/**
 * Past this even the active time looks wrong (a set left started overnight),
 * so the finish sheet asks for the real duration.
 */
export const LONG_SESSION_SECONDS = 4 * 3600;

/**
 * A break between two actions longer than this is not training — the session
 * was left open (overnight, until the next day) — and does not count.
 */
const IDLE_GAP_SECONDS = 30 * 60;

const ms = (stamp: string | null | undefined) => {
  const t = stamp ? new Date(stamp).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};

/**
 * Seconds actually spent training: the time from the session start through
 * every set action (start, finish, rest) up to `now`, without the breaks
 * longer than {@link IDLE_GAP_SECONDS}. Time inside a set that was started and
 * not yet finished always counts — a long timed set is work, not a break.
 * Stands in for a pause button: leave the session open, come back tomorrow,
 * and the night is not on the clock.
 */
export function activeSeconds(
  session: Pick<WorkoutSession, 'started_at' | 'exercises'> | null,
  now: number,
): number {
  const start = ms(session?.started_at);
  if (start == null) return 0;

  const sets = (session?.exercises ?? []).flatMap((ex) => ex.sets);
  const events = [start];
  const inSet: [number, number][] = [];
  for (const set of sets) {
    const began = ms(set.started_at);
    const done = ms(set.completed_at);
    for (const t of [began, done, ms(set.rest_started_at)]) if (t != null) events.push(t);
    if (began != null) inSet.push([began, done ?? Infinity]);
  }
  events.push(now);
  const points = events.filter((t) => t >= start && t <= now).sort((a, b) => a - b);

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const gap = to - from;
    if (gap <= IDLE_GAP_SECONDS * 1000 || inSet.some(([b, d]) => b <= from && d >= to)) {
      total += gap;
    }
  }
  return Math.floor(total / 1000);
}
