import type { EffortPhase, EffortPhaseType, EffortSeriesPoint } from '../types/api';

/** Never let the curve fill the whole box — a flat run still needs headroom. */
const Y_MIN_CEILING = 0.6;
const Y_MAX_FLOOR = 1.4;

export const PHASE_COLORS: Record<EffortPhaseType, string> = {
  warmup: '#3b82f6', // sky
  steady: '#9ca3af', // gray
  peak: '#f59e0b', // amber
  decline: '#ef4444', // rose
  cooldown: '#6366f1', // indigo
  intervals: '#8b5cf6', // violet
};

/**
 * Split the series into runs of consecutive measured points.
 *
 * `e === null` means the athlete was standing still. Drawing straight through
 * a pause would invent effort that was never recorded, so each run is rendered
 * as its own polyline and the gap stays a gap.
 */
export function splitEffortSegments(series: EffortSeriesPoint[]): EffortSeriesPoint[][] {
  const segments: EffortSeriesPoint[][] = [];
  let current: EffortSeriesPoint[] = [];

  for (const point of series) {
    if (point.e === null || point.e === undefined) {
      if (current.length > 0) segments.push(current);
      current = [];
    } else {
      current.push(point);
    }
  }
  if (current.length > 0) segments.push(current);

  return segments;
}

/** Y bounds, always wide enough to show where 1.0 sits. */
export function effortYRange(series: EffortSeriesPoint[]): { min: number; max: number } {
  const values = series.map((p) => p.e).filter((e): e is number => e !== null && e !== undefined);
  if (values.length === 0) return { min: Y_MIN_CEILING, max: Y_MAX_FLOOR };

  return {
    min: Math.min(Y_MIN_CEILING, ...values),
    max: Math.max(Y_MAX_FLOOR, ...values),
  };
}

/** Phase types in the order they occur, deduplicated. */
export function uniquePhaseTypes(phases: EffortPhase[]): EffortPhaseType[] {
  return [...new Set(phases.map((p) => p.type))];
}

/**
 * Mirror of the backend qualification rule (completed, has a GPS track,
 * >= 8 min, >= 1 km). Checking it client-side saves a request for activities
 * that could only ever answer 204.
 */
export function qualifiesForEffortAnalysis(activity: {
  status?: string;
  has_gps_track?: boolean;
  duration?: number;
  distance?: number;
}): boolean {
  return (
    activity.status === 'completed' &&
    activity.has_gps_track === true &&
    (activity.duration ?? 0) >= 480 &&
    (activity.distance ?? 0) >= 1000
  );
}
