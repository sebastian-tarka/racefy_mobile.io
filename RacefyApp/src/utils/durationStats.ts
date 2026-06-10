/**
 * Pure per-second duration/calories tick for the live-tracking timer. Extracted
 * from useLiveActivity so the (monotonic, max-clamped) calorie accumulation is
 * testable without a real interval. The hook owns the setInterval + setState.
 */

export interface DurationTick {
  /** Elapsed whole seconds since tracking started. */
  duration: number;
  /** Calories — never decreases (clamped to at least the previous value). */
  calories: number;
}

/**
 * Compute the duration + calories for the current tick.
 *
 * Behaviour is preserved 1:1 from the original timer: duration is the whole
 * seconds since `trackingStartTime`; calories is `baseCalories` plus the
 * per-second rate applied to the seconds elapsed *since the previous tick*, then
 * clamped so it can only ever grow.
 */
export function computeDurationTick(params: {
  trackingStartTime: number;
  now: number;
  baseCalories: number;
  previousDuration: number;
  previousCalories: number;
  caloriesPerSecond: number;
}): DurationTick {
  const {
    trackingStartTime,
    now,
    baseCalories,
    previousDuration,
    previousCalories,
    caloriesPerSecond,
  } = params;

  const duration = Math.floor((now - trackingStartTime) / 1000);
  const calories = Math.max(
    previousCalories,
    Math.floor(baseCalories + (duration - previousDuration) * caloriesPerSecond),
  );

  return { duration, calories };
}