import { splitPaceFromPoints } from '../splitPace';

// splitPace reaches trackingDb (→ logger → AsyncStorage) for the DB-backed
// helper; these tests exercise the pure function only.
jest.mock('../../logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(), gps: jest.fn() },
}));
jest.mock('expo-sqlite', () => ({ openDatabaseSync: () => null }));

const T0 = 1_700_000_000_000;
/** Points every 10 s at the given m/s, starting at `startM` / `startMs`. */
function run(
  seconds: number,
  speedMs: number,
  startM: number,
  startMs: number,
): { ts: string; cumDist: number }[] {
  const out = [];
  for (let s = 0; s <= seconds; s += 10) {
    out.push({ ts: new Date(startMs + s * 1000).toISOString(), cumDist: startM + s * speedMs });
  }
  return out;
}

describe('splitPaceFromPoints', () => {
  it('reads the split of a steady kilometre', () => {
    // 1000 m in 300 s = 5:00 /km
    const points = run(300, 1000 / 300, 0, T0);
    expect(splitPaceFromPoints(points, 0, 1000)).toBeCloseTo(5, 2);
  });

  it('leaves a pause out of the split', () => {
    // 500 m at 5:00, a 10-minute hole (GPS stopped), another 500 m at 5:00.
    const first = run(150, 1000 / 300, 0, T0);
    const second = run(150, 1000 / 300, 500, T0 + 150_000 + 600_000);
    const points = [...first, ...second.slice(1)];
    expect(splitPaceFromPoints(points, 0, 1000)).toBeCloseTo(5, 2);
  });

  it('uses only the interval asked for, clipping the anchor point before it', () => {
    // km 1 at 6:00, km 2 at 4:00 — asking for km 2 must not see km 1.
    const slow = run(360, 1000 / 360, 0, T0);
    const fast = run(240, 1000 / 240, 1000, T0 + 360_000);
    const points = [...slow, ...fast.slice(1)];
    expect(splitPaceFromPoints(points, 1000, 2000)).toBeCloseTo(4, 2);
    expect(splitPaceFromPoints(points, 0, 1000)).toBeCloseTo(6, 2);
  });

  it('gives up when the log covers less than half the interval', () => {
    const points = run(60, 1000 / 300, 0, T0); // 200 m of a 1000 m split
    expect(splitPaceFromPoints(points, 0, 1000)).toBeNull();
  });

  it('ignores points without a cumulative distance', () => {
    const points = [
      { ts: new Date(T0).toISOString() },
      { ts: new Date(T0 + 10_000).toISOString() },
    ];
    expect(splitPaceFromPoints(points, 0, 1000)).toBeNull();
  });
});
