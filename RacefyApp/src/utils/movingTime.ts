import type { Activity } from '../types/api';

type Timed = Pick<Activity, 'duration'> & { moving_time?: number | null };

/**
 * The time pace is read from: moving time (standing still left out) when the
 * API measured one, else duration. Mirrors the API's `Activity::paceSeconds()`
 * — an API from before moving time simply sends none.
 */
export function paceSeconds(activity: Timed): number {
  return activity.moving_time || activity.duration;
}

/**
 * Moving time worth showing next to the duration: only when standing still
 * took a noticeable share (≥ 1 min, or ≥ 3% and ≥ 15 s). A few seconds of
 * difference would just be noise under the main number.
 */
export function visibleMovingTime(activity: Timed): number | null {
  const moving = activity.moving_time;
  if (!moving || !activity.duration) return null;
  const stopped = activity.duration - moving;
  if (stopped >= 60 || (stopped >= 15 && stopped / activity.duration >= 0.03)) return moving;
  return null;
}
