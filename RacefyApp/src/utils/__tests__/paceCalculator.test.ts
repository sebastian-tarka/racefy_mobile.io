import { PaceTracker } from '../paceCalculator';

describe('PaceTracker', () => {
  const profile = { paceWindowSeconds: 60, minSegmentDistance: 10, paceSmoothingFactor: 0.5 };

  it('returns null until there are at least two segments', () => {
    const t = new PaceTracker();
    expect(t.record({ timestamp: 1000, distance: 0 }, profile)).toBeNull();
    expect(t.currentPace).toBeNull();
    expect(t.size).toBe(1);
  });

  it('returns the first valid pace unsmoothed, then EMA-blends later paces', () => {
    const t = new PaceTracker();
    const now = Date.now();
    t.record({ timestamp: now, distance: 0 }, profile);
    // 10 s over 50 m → 200 s/km, first value passes through unsmoothed
    expect(t.record({ timestamp: now + 10_000, distance: 50 }, profile)).toBeCloseTo(200, 5);
    // third sample raw pace = 20 s / 250 m → 80 s/km; EMA(0.5): 0.5*80 + 0.5*200 = 140
    expect(t.record({ timestamp: now + 20_000, distance: 250 }, profile)).toBeCloseTo(140, 5);
    expect(t.currentPace).toBeCloseTo(140, 5);
  });

  it('holds the previous smoothed pace when a sample yields no valid raw pace', () => {
    const t = new PaceTracker();
    const now = Date.now();
    t.record({ timestamp: now, distance: 0 }, profile);
    t.record({ timestamp: now + 10_000, distance: 50 }, profile); // → 200
    // a stricter min-distance makes the delta sub-threshold → raw null → keep 200
    const strict = { ...profile, minSegmentDistance: 1000 };
    expect(t.record({ timestamp: now + 20_000, distance: 60 }, strict)).toBeCloseTo(200, 5);
  });

  it('caps the buffer at maxSegments', () => {
    const t = new PaceTracker();
    for (let i = 0; i < 5; i++) {
      t.record({ timestamp: i * 1000, distance: i }, profile, 3);
    }
    expect(t.size).toBe(3);
  });

  it('reset() clears segments and smoothed pace', () => {
    const t = new PaceTracker();
    const now = Date.now();
    t.record({ timestamp: now, distance: 0 }, profile);
    t.record({ timestamp: now + 10_000, distance: 50 }, profile);
    expect(t.currentPace).not.toBeNull();
    t.reset();
    expect(t.size).toBe(0);
    expect(t.currentPace).toBeNull();
  });
});
