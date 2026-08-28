import {
  effortYRange,
  qualifiesForEffortAnalysis,
  splitEffortSegments,
  uniquePhaseTypes,
} from '../effortAnalysis';
import type { EffortPhase, EffortSeriesPoint } from '../../types/api';

const point = (t: number, d: number, e: number | null): EffortSeriesPoint => ({ t, d, e });

const phase = (type: EffortPhase['type'], start: number, end: number): EffortPhase => ({
  type,
  start_s: start,
  end_s: end,
  duration_s: end - start,
  start_distance: start,
  end_distance: end,
  avg_effort: 1,
  trend: 0,
  confidence: 0.8,
  avg_speed: null,
  avg_heart_rate: null,
});

describe('splitEffortSegments', () => {
  it('keeps an uninterrupted series in one piece', () => {
    const series = [point(0, 0, 0.9), point(10, 30, 1.0), point(20, 60, 1.1)];
    expect(splitEffortSegments(series)).toEqual([series]);
  });

  it('breaks the curve at a pause instead of drawing through it', () => {
    const series = [
      point(0, 0, 0.9),
      point(10, 30, 1.0),
      point(20, 30, null), // athlete standing still
      point(30, 30, null),
      point(40, 60, 1.2),
      point(50, 90, 1.1),
    ];

    const segments = splitEffortSegments(series);

    expect(segments).toHaveLength(2);
    expect(segments[0].map((p) => p.e)).toEqual([0.9, 1.0]);
    expect(segments[1].map((p) => p.e)).toEqual([1.2, 1.1]);
  });

  it('drops a series that is nothing but pauses', () => {
    expect(splitEffortSegments([point(0, 0, null), point(10, 0, null)])).toEqual([]);
  });
});

describe('effortYRange', () => {
  it('always keeps the 1.0 baseline comfortably inside the box', () => {
    const range = effortYRange([point(0, 0, 0.99), point(10, 30, 1.01)]);
    expect(range.min).toBe(0.6);
    expect(range.max).toBe(1.4);
  });

  it('widens for values outside the default window', () => {
    const range = effortYRange([point(0, 0, 0.4), point(10, 30, 1.9)]);
    expect(range.min).toBe(0.4);
    expect(range.max).toBe(1.9);
  });

  it('ignores pauses when measuring the range', () => {
    const range = effortYRange([point(0, 0, null), point(10, 30, 2.2)]);
    expect(range.max).toBe(2.2);
  });

  it('falls back to the default window with no measured points', () => {
    expect(effortYRange([point(0, 0, null)])).toEqual({ min: 0.6, max: 1.4 });
  });
});

describe('uniquePhaseTypes', () => {
  it('deduplicates while keeping the order the phases occur in', () => {
    const phases = [
      phase('warmup', 0, 100),
      phase('steady', 100, 200),
      phase('peak', 200, 260),
      phase('steady', 260, 400),
    ];
    expect(uniquePhaseTypes(phases)).toEqual(['warmup', 'steady', 'peak']);
  });

  it('reports a single type for a session that never changed gear', () => {
    // The card uses this to decide not to draw bands: one band across the whole
    // chart is a flat wash that adds nothing to the header.
    expect(uniquePhaseTypes([phase('steady', 0, 100), phase('steady', 100, 200)])).toEqual([
      'steady',
    ]);
  });
});

describe('qualifiesForEffortAnalysis', () => {
  // Mirror of the backend rule — saves a request for activities that could
  // only ever answer 204.
  const base = { status: 'completed', has_gps_track: true, duration: 600, distance: 2000 };

  it('accepts a completed GPS activity over 8 min and 1 km', () => {
    expect(qualifiesForEffortAnalysis(base)).toBe(true);
  });

  it('rejects an activity that is still running', () => {
    expect(qualifiesForEffortAnalysis({ ...base, status: 'in_progress' })).toBe(false);
  });

  it('rejects an indoor session with no GPS track', () => {
    expect(qualifiesForEffortAnalysis({ ...base, has_gps_track: false })).toBe(false);
  });

  it('rejects anything under the duration or distance floor', () => {
    expect(qualifiesForEffortAnalysis({ ...base, duration: 479 })).toBe(false);
    expect(qualifiesForEffortAnalysis({ ...base, distance: 999 })).toBe(false);
  });

  it('accepts exactly at the boundary', () => {
    expect(qualifiesForEffortAnalysis({ ...base, duration: 480, distance: 1000 })).toBe(true);
  });
});
