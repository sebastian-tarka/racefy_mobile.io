import {
  isStationary,
  computeEffectiveMinDistance,
  computeImpliedSpeed,
  isGapPoint,
  GpsSmoothingBuffer,
  classifyGpsPoint,
  GpsTracker,
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

  it('bridges a post-gap hop when the implied speed is realistic (distance counted, segment break)', () => {
    const d = classify({
      // baseline.timestamp = 0 → 30 s elapsed; ~90 m hop ≈ 3 m/s (realistic)
      baseline: { lat: 52, lng: 21, ele: 100, timestamp: 0 },
      smoothedPoint: { lat: 52 + 90 * DEG_PER_M, lng: 21, ele: 100 },
      currentTimestamp: 30_000,
      lastBufferedPointTime: 0, // 30 s gap > 10 s threshold
    });
    expect(d.outcome).toBe('gap-bridged');
    expect(d.distanceAdded).toBeCloseTo(90, 0);
    expect(d.segmentBreak).toBe(true);
    expect(d.gapMs).toBe(30_000);
  });

  it('discards a post-gap hop with unrealistic implied speed', () => {
    const d = classify({
      baseline: { lat: 52, lng: 21, ele: 100, timestamp: 0 },
      smoothedPoint: { lat: 52 + 5000 * DEG_PER_M, lng: 21, ele: 100 }, // 5 km in 30 s ≈ 167 m/s
      currentTimestamp: 30_000,
      lastBufferedPointTime: 0,
    });
    expect(d.outcome).toBe('gap');
    expect(d.distanceAdded).toBe(0);
    expect(d.segmentBreak).toBe(false);
  });

  it('discards a negligible post-gap movement (nothing to bridge)', () => {
    const d = classify({
      baseline: { lat: 52, lng: 21, ele: 100, timestamp: 0 },
      smoothedPoint: { lat: 52 + 1 * DEG_PER_M, lng: 21, ele: 100 }, // ~1 m < 4 m threshold
      currentTimestamp: 30_000,
      lastBufferedPointTime: 0,
    });
    expect(d.outcome).toBe('gap');
    expect(d.distanceAdded).toBe(0);
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

describe('GpsTracker', () => {
  const DEG_PER_M = 1 / 111_320;
  // bufferSize 1 → the smoothed point equals the raw point, so distances are predictable.
  const profile = {
    smoothingBufferSize: 1,
    minDistanceThreshold: 4,
    maxRealisticSpeed: 50,
    minElevationChange: 1,
    stationarySpeedThreshold: 0.5,
  };
  const feed = (
    t: GpsTracker,
    raw: { lat: number; lng: number; ele?: number; timestamp: number },
    rawSpeed = 3,
  ) => t.addPoint({ raw, profile, gapThresholdMs: 10_000, rawSpeed });

  it('the first point sets the baseline with no decision', () => {
    const t = new GpsTracker();
    const r = feed(t, { lat: 52, lng: 21, ele: 100, timestamp: 0 });
    expect(r.decision).toBeNull();
    expect(t.lastPosition).toEqual({ lat: 52, lng: 21, ele: 100, timestamp: 0 });
    expect(t.lastBufferedTime).toBeNull(); // gap clock only advances once classifying begins
  });

  it('accepts a realistic second point and advances baseline + gap clock', () => {
    const t = new GpsTracker();
    feed(t, { lat: 52, lng: 21, ele: 100, timestamp: 0 });
    const r = feed(t, { lat: 52 + 10 * DEG_PER_M, lng: 21, ele: 105, timestamp: 3000 });
    expect(r.decision?.outcome).toBe('accepted');
    expect(r.decision?.distanceAdded).toBeCloseTo(10, 0);
    expect(r.decision?.elevationAdded).toBeCloseTo(5, 5);
    expect(t.lastBufferedTime).toBe(3000); // advanced on accept
    expect(t.lastPosition?.timestamp).toBe(3000);
  });

  it('advances the baseline even when the point is distance-filtered (gap clock stays)', () => {
    const t = new GpsTracker();
    feed(t, { lat: 52, lng: 21, ele: 100, timestamp: 0 });
    feed(t, { lat: 52 + 10 * DEG_PER_M, lng: 21, timestamp: 3000 }); // accepted → gap clock 3000
    const r = feed(t, { lat: 52 + 11 * DEG_PER_M, lng: 21, timestamp: 6000 }); // ~1 m move < 4 m
    expect(r.decision?.outcome).toBe('filtered-distance');
    expect(t.lastBufferedTime).toBe(3000); // NOT advanced on a filtered point
    expect(t.lastPosition?.timestamp).toBe(6000); // baseline still advances
  });

  it('bridges a realistic post-gap hop and advances the gap clock', () => {
    const t = new GpsTracker();
    feed(t, { lat: 52, lng: 21, timestamp: 0 });
    feed(t, { lat: 52 + 10 * DEG_PER_M, lng: 21, timestamp: 3000 }); // gap clock → 3000
    // 17 s > 10 s threshold; ~10 m hop ≈ 0.6 m/s — realistic → bridged
    const r = feed(t, { lat: 52 + 20 * DEG_PER_M, lng: 21, timestamp: 20_000 });
    expect(r.decision?.outcome).toBe('gap-bridged');
    expect(r.decision?.distanceAdded).toBeCloseTo(10, 0);
    expect(r.decision?.segmentBreak).toBe(true);
    expect(t.lastBufferedTime).toBe(20_000); // advanced on bridged gap
  });

  it('discards an unrealistic post-gap hop and advances the gap clock', () => {
    const t = new GpsTracker();
    feed(t, { lat: 52, lng: 21, timestamp: 0 });
    feed(t, { lat: 52 + 10 * DEG_PER_M, lng: 21, timestamp: 3000 }); // gap clock → 3000
    // 17 s gap but ~5 km hop ≈ 294 m/s → glitch, discarded
    const r = feed(t, { lat: 52 + 5000 * DEG_PER_M, lng: 21, timestamp: 20_000 });
    expect(r.decision?.outcome).toBe('gap');
    expect(r.decision?.distanceAdded).toBe(0);
    expect(t.lastBufferedTime).toBe(20_000); // advanced on gap
  });

  it('exposes currentPosition and supports manual baseline/gap-clock seeding', () => {
    const t = new GpsTracker();
    expect(t.currentPosition).toBeNull();
    t.lastPosition = { lat: 10, lng: 20, timestamp: 500 };
    t.lastBufferedTime = 500;
    expect(t.currentPosition).toEqual({ lat: 10, lng: 20 });
    t.lastPosition = null;
    expect(t.currentPosition).toBeNull();
    expect(t.lastBufferedTime).toBe(500);
  });

  it('clearBuffer() drops the smoothing window without touching the baseline', () => {
    const t = new GpsTracker();
    feed(t, { lat: 52, lng: 21, timestamp: 0 });
    const baseline = t.lastPosition;
    t.clearBuffer();
    expect(t.lastPosition).toEqual(baseline); // baseline untouched
    // after clearBuffer the next point is the only one in the window → smoothed == raw
    const s = t.smooth({ lat: 60, lng: 30, timestamp: 9 }, 1);
    expect(s).toEqual({ lat: 60, lng: 30, ele: undefined, timestamp: 9 });
  });
});
