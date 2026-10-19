import { ROUTE_SETTLE_EVERY, routeFeature, settledBoundary } from '../routeChunks';

type P = { lat: number; lng: number; segment_break?: boolean };

const track = (n: number, breaks: number[] = []): P[] =>
  Array.from({ length: n }, (_, i) => ({
    lat: 52 + i * 1e-4,
    lng: 21 + i * 1e-4,
    ...(breaks.includes(i) && { segment_break: true }),
  }));

const coords = (f: ReturnType<typeof routeFeature>) => f?.geometry.coordinates ?? [];

/** Settled + tail, glued back together where they share the boundary point. */
function chunked(points: P[]): [number, number][][] {
  const b = settledBoundary(points.length);
  const settled = b > 0 ? coords(routeFeature(points, 0, b)) : [];
  const tail = coords(routeFeature(points, b, points.length - 1));
  if (!settled.length) return tail;
  if (!tail.length) return settled;
  const last = settled[settled.length - 1];
  const first = tail[0];
  const shared = last[last.length - 1];
  if (first[0][0] === shared[0] && first[0][1] === shared[1]) {
    return [...settled.slice(0, -1), [...last, ...first.slice(1)], ...tail.slice(1)];
  }
  return [...settled, ...tail];
}

describe('settledBoundary', () => {
  it('keeps everything in the tail until the first chunk is full', () => {
    expect(settledBoundary(0)).toBe(0);
    expect(settledBoundary(1)).toBe(0);
    expect(settledBoundary(ROUTE_SETTLE_EVERY)).toBe(0);
    expect(settledBoundary(ROUTE_SETTLE_EVERY + 1)).toBe(ROUTE_SETTLE_EVERY);
    expect(settledBoundary(3 * ROUTE_SETTLE_EVERY + 7)).toBe(3 * ROUTE_SETTLE_EVERY);
  });
});

describe('routeFeature', () => {
  it('returns null for fewer than two drawable points', () => {
    expect(routeFeature(track(1), 0, 0)).toBeNull();
    expect(routeFeature(track(3, [1, 2]), 0, 2)).toBeNull();
  });

  it('splits at segment_break', () => {
    expect(coords(routeFeature(track(6, [3]), 0, 5)).map((s) => s.length)).toEqual([3, 3]);
  });
});

describe('settled + tail', () => {
  const cases: [string, number, number[]][] = [
    ['short route, tail only', 120, [40]],
    ['exactly one chunk', ROUTE_SETTLE_EVERY, []],
    ['a few chunks, no gaps', 2 * ROUTE_SETTLE_EVERY + 55, []],
    ['gaps inside chunks', 3 * ROUTE_SETTLE_EVERY + 10, [17, 450, 899]],
    ['gap exactly on the boundary', 2 * ROUTE_SETTLE_EVERY + 20, [ROUTE_SETTLE_EVERY]],
    ['gap right after the boundary', 2 * ROUTE_SETTLE_EVERY + 20, [ROUTE_SETTLE_EVERY + 1]],
  ];

  it.each(cases)('draws the same line as one source: %s', (_name, n, breaks) => {
    const points = track(n, breaks);
    expect(chunked(points)).toEqual(coords(routeFeature(points, 0, n - 1)));
  });

  it('leaves the settled part untouched while the tail grows', () => {
    const points = track(ROUTE_SETTLE_EVERY + 2);
    const b = settledBoundary(points.length);
    const before = JSON.stringify(routeFeature(points, 0, b));
    points.push(...track(50).map((p) => ({ ...p, lat: p.lat + 1 })));
    expect(settledBoundary(points.length)).toBe(b);
    expect(JSON.stringify(routeFeature(points, 0, b))).toBe(before);
  });
});
