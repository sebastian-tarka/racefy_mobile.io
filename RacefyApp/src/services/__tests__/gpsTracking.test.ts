import {
  isStationary,
  computeEffectiveMinDistance,
  computeImpliedSpeed,
  isGapPoint,
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