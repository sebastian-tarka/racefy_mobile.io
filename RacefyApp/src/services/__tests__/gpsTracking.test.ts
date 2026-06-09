import {
  isStationary,
  computeEffectiveMinDistance,
  computeImpliedSpeed,
  isGapPoint,
  GpsSmoothingBuffer,
  classifyGpsPoint,
} from '../gpsTracking';

describe('isStationary', () => {
  it('is true below the threshold', () => {
    expect(isStationary(0.3, 0.5)).toBe(true);
  });

  it('is false at or above the threshold', () => {
    expect(isStationary(0.5, 0.5)).toBe(false);
    expect(isStationary(2, 0.5)).toBe(false);
  });

  it('is false for null/undefined speed (unknown ≠ stationary)', () => {
    expect(isStationary(null, 0.5)).toBe(false);
    expect(isStationary(undefined, 0.5)).toBe(false);
  });
});

describe('computeEffectiveMinDistance', () => {
  it('returns the profile threshold when moving', () => {
    expect(computeEffectiveMinDistance(false, 4)).toBe(4);
  });

  it('raises the threshold to at least the stationary minimum when stopped', () => {
    expect(computeEffectiveMinDistance(true, 4)).toBe(8); // default stationary min = 8
  });

  it('keeps a higher profile threshold even when stationary', () => {
    expect(computeEffectiveMinDistance(true, 12)).toBe(12);
  });

  it('honours a custom stationary minimum', () => {
    expect(computeEffectiveMinDistance(true, 4, 10)).toBe(10);
  });
});

describe('computeImpliedSpeed', () => {
  it('is distance over time', () => {
    expect(computeImpliedSpeed(30, 3)).toBe(10);
  });

  it('returns the large sentinel for a non-positive time delta', () => {
    expect(computeImpliedSpeed(30, 0)).toBe(999);
    expect(computeImpliedSpeed(30, -1)).toBe(999);
  });
});

describe('isGapPoint', () => {
  it('is false when there is no previous buffered point', () => {
    expect(isGapPoint(null, 1000, 5000)).toBe(false);
  });

  it('is false within the gap threshold', () => {
    expect(isGapPoint(1000, 4000, 5000)).toBe(false); // 3s gap < 5s threshold
  });

  it('is true beyond the gap threshold', () => {
    expect(isGapPoint(1000, 7000, 5000)).toBe(true); // 6s gap > 5s threshold
  });

  it('is false exactly at the threshold (strictly greater)', () => {
    expect(isGapPoint(1000, 6000, 5000)).toBe(false);
  });
});

describe('GpsSmoothingBuffer', () => {
  it('returns the single point unchanged on first add', () => {
    const buf = new GpsSmoothingBuffer();
    const smoothed = buf.add({ lat: 52, lng: 21, ele: 100, timestamp: 1 }, 5);
    expect(smoothed).toEqual({ lat: 52, lng: 21, ele: 100, timestamp: 1 });
    expect(buf.size).toBe(1);
  });

  it('evicts the oldest point beyond maxSize', () => {
    const buf = new GpsSmoothingBuffer();
    for (let i = 1; i <= 5; i++) {
      buf.add({ lat: 52, lng: 21, timestamp: i }, 3);
    }
    expect(buf.size).toBe(3);
  });

  it('weights newer points more heavily across the window', () => {
    const buf = new GpsSmoothingBuffer();
    buf.add({ lat: 10, lng: 10, timestamp: 1 }, 5);
    const smoothed = buf.add({ lat: 20, lng: 20, timestamp: 2 }, 5);
    // weights 1,2 → (10*1 + 20*2)/3
    expect(smoothed.lat).toBeCloseTo(50 / 3, 6);
    expect(smoothed.timestamp).toBe(2);
  });

  it('clear() empties the buffer', () => {
    const buf = new GpsSmoothingBuffer();
    buf.add({ lat: 1, lng: 1, timestamp: 1 }, 5);
    buf.add({ lat: 2, lng: 2, timestamp: 2 }, 5);
    buf.clear();
    expect(buf.size).toBe(0);
    // after clear, the next add is treated as the first point again
    const smoothed = buf.add({ lat: 9, lng: 9, timestamp: 3 }, 5);
    expect(smoothed).toEqual({ lat: 9, lng: 9, ele: undefined, timestamp: 3 });
  });
});

describe('classifyGpsPoint', () => {
  const profile = {
    minDistanceThreshold: 4,
    maxRealisticSpeed: 50, // m/s
    minElevationChange: 1,
    stationarySpeedThreshold: 0.5,
  };
  // ~metres of latitude per degree, used to build moves of a known distance.
  const DEG_PER_M = 1 / 111_320;
  const baseline = { lat: 52, lng: 21, ele: 100, timestamp: 0 };

  const classify = (over: Partial<Parameters<typeof classifyGpsPoint>[0]> = {}) =>
    classifyGpsPoint({
      baseline,
      smoothedPoint: { lat: 52, lng: 21, ele: 100 },
      currentTimestamp: 3000,
      lastBufferedPointTime: 0,
      rawSpeed: 3,
      profile,
      gapThresholdMs: 10_000,
      ...over,
    });

  it('accepts a realistic move and reports distance + elevation deltas', () => {
    const d = classify({
      smoothedPoint: { lat: 52 + 10 * DEG_PER_M, lng: 21, ele: 105 }, // ~10 m north, +5 m up
    });
    expect(d.outcome).toBe('accepted');
    expect(d.distance).toBeCloseTo(10, 0);
    expect(d.distanceAdded).toBe(d.distance);
    expect(d.elevationAdded).toBeCloseTo(5, 5);
    expect(d.impliedSpeed).toBeCloseTo(10 / 3, 1);
  });

  it('filters a sub-threshold movement (no distance counted)', () => {
    const d = classify({
      smoothedPoint: { lat: 52 + 1 * DEG_PER_M, lng: 21, ele: 100 }, // ~1 m < 4 m threshold
    });
    expect(d.outcome).toBe('filtered-distance');
    expect(d.distanceAdded).toBe(0);
    expect(d.elevationAdded).toBe(0);
  });

  it('filters an unrealistic-speed jump (no distance counted)', () => {
    const d = classify({
      smoothedPoint: { lat: 52 + 1100 * DEG_PER_M, lng: 21, ele: 100 }, // ~1100 m in 3 s ≈ 367 m/s
    });
    expect(d.outcome).toBe('filtered-speed');
    expect(d.impliedSpeed).toBeGreaterThan(profile.maxRealisticSpeed);
    expect(d.distanceAdded).toBe(0);
  });

  it('discards a post-gap jump even when distance + speed are realistic', () => {
    const d = classify({
      smoothedPoint: { lat: 52 + 10 * DEG_PER_M, lng: 21, ele: 100 },
      currentTimestamp: 30_000,
      lastBufferedPointTime: 0, // 30 s gap > 10 s threshold
    });
    expect(d.outcome).toBe('gap');
    expect(d.distanceAdded).toBe(0);
    expect(d.gapMs).toBe(30_000);
  });

  it('applies the stricter stationary threshold when GPS reports a low speed', () => {
    const move6m = { lat: 52 + 6 * DEG_PER_M, lng: 21, ele: 100 };
    // stationary (rawSpeed 0.3): effective min rises to 8 m, so a 6 m move is filtered
    expect(classify({ smoothedPoint: move6m, rawSpeed: 0.3 }).outcome).toBe('filtered-distance');
    // moving (rawSpeed 2): default 4 m threshold, so the same 6 m move is accepted
    expect(classify({ smoothedPoint: move6m, rawSpeed: 2 }).outcome).toBe('accepted');
  });

  it('ignores elevation changes below the noise floor on an accepted point', () => {
    const d = classify({
      smoothedPoint: { lat: 52 + 10 * DEG_PER_M, lng: 21, ele: 100.5 }, // +0.5 m < 1 m floor
    });
    expect(d.outcome).toBe('accepted');
    expect(d.elevationAdded).toBe(0);
  });
});