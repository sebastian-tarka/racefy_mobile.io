import { computeDurationTick } from '../durationStats';

describe('computeDurationTick', () => {
  it('reports elapsed whole seconds since tracking started', () => {
    const { duration } = computeDurationTick({
      trackingStartTime: 0,
      now: 10_500, // 10.5 s → floored to 10
      baseCalories: 0,
      previousDuration: 0,
      previousCalories: 0,
      caloriesPerSecond: 5,
    });
    expect(duration).toBe(10);
  });

  it('adds calories for the seconds elapsed since the previous tick (on top of base)', () => {
    const { calories } = computeDurationTick({
      trackingStartTime: 0,
      now: 1000, // 1 s
      baseCalories: 100,
      previousDuration: 0,
      previousCalories: 0,
      caloriesPerSecond: 5,
    });
    // floor(100 + (1 - 0) * 5) = 105
    expect(calories).toBe(105);
  });

  it('never lets calories decrease (clamped to the previous value)', () => {
    const { calories } = computeDurationTick({
      trackingStartTime: 0,
      now: 11_000,
      baseCalories: 0,
      previousDuration: 10,
      previousCalories: 250, // already higher than this tick would compute
      caloriesPerSecond: 5,
    });
    // computed = floor(0 + (11 - 10) * 5) = 5, but max(250, 5) = 250
    expect(calories).toBe(250);
  });

  it('honours an initial duration offset baked into trackingStartTime', () => {
    // started 30 s ago (trackingStartTime = now - 30_000)
    const { duration } = computeDurationTick({
      trackingStartTime: 70_000,
      now: 100_000,
      baseCalories: 0,
      previousDuration: 0,
      previousCalories: 0,
      caloriesPerSecond: 5,
    });
    expect(duration).toBe(30);
  });
});