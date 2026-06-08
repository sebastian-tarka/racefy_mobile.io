import { haversineDistance, smoothPositionFromBuffer, accumulateTrackDelta } from '../gpsMath';

describe('haversineDistance', () => {
  it('is zero for identical points', () => {
    expect(haversineDistance(52.2297, 21.0122, 52.2297, 21.0122)).toBe(0);
  });

  it('matches a known short distance (~111m per 0.001° latitude)', () => {
    const d = haversineDistance(52.0, 21.0, 52.001, 21.0);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it('approximates the Warsaw–Krakow distance (~252 km)', () => {
    const d = haversineDistance(52.2297, 21.0122, 50.0647, 19.945);
    expect(d / 1000).toBeGreaterThan(245);
    expect(d / 1000).toBeLessThan(260);
  });

  it('is symmetric', () => {
    const a = haversineDistance(52.0, 21.0, 50.0, 19.0);
    const b = haversineDistance(50.0, 19.0, 52.0, 21.0);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('smoothPositionFromBuffer', () => {
  it('returns the single point unchanged (weight 1)', () => {
    const result = smoothPositionFromBuffer([{ lat: 52, lng: 21, ele: 100, timestamp: 5 }], 5);
    expect(result).toEqual({ lat: 52, lng: 21, ele: 100, timestamp: 5 });
  });

  it('weights newer points more heavily (linear weights)', () => {
    // weights 1 and 2 → (10*1 + 20*2)/3 = 16.666...
    const result = smoothPositionFromBuffer(
      [
        { lat: 10, lng: 10, timestamp: 1 },
        { lat: 20, lng: 20, timestamp: 2 },
      ],
      2,
    );
    expect(result.lat).toBeCloseTo(50 / 3, 6);
    expect(result.lng).toBeCloseTo(50 / 3, 6);
    expect(result.timestamp).toBe(2);
  });

  it('uses the median for elevation (odd count)', () => {
    const result = smoothPositionFromBuffer(
      [
        { lat: 0, lng: 0, ele: 100, timestamp: 1 },
        { lat: 0, lng: 0, ele: 300, timestamp: 2 },
        { lat: 0, lng: 0, ele: 200, timestamp: 3 },
      ],
      3,
    );
    expect(result.ele).toBe(200);
  });

  it('averages the two middle elevations (even count)', () => {
    const result = smoothPositionFromBuffer(
      [
        { lat: 0, lng: 0, ele: 100, timestamp: 1 },
        { lat: 0, lng: 0, ele: 200, timestamp: 2 },
        { lat: 0, lng: 0, ele: 300, timestamp: 3 },
        { lat: 0, lng: 0, ele: 400, timestamp: 4 },
      ],
      4,
    );
    expect(result.ele).toBe(250);
  });

  it('leaves elevation undefined when no point has one', () => {
    const result = smoothPositionFromBuffer(
      [
        { lat: 1, lng: 1, timestamp: 1 },
        { lat: 2, lng: 2, timestamp: 2 },
      ],
      2,
    );
    expect(result.ele).toBeUndefined();
  });

  it('ignores points without elevation when taking the median', () => {
    const result = smoothPositionFromBuffer(
      [
        { lat: 0, lng: 0, timestamp: 1 },
        { lat: 0, lng: 0, ele: 100, timestamp: 2 },
        { lat: 0, lng: 0, ele: 200, timestamp: 3 },
      ],
      3,
    );
    // only [100, 200] have elevation → median = 150
    expect(result.ele).toBe(150);
  });
});

describe('accumulateTrackDelta', () => {
  it('returns zero for an empty list', () => {
    expect(accumulateTrackDelta([], { lat: 52, lng: 21 }, 0, 0)).toEqual({
      distance: 0,
      elevationGain: 0,
    });
  });

  it('accumulates distance across moving points from the start point', () => {
    const start = { lat: 52, lng: 21 };
    const points = [
      { lat: 52.001, lng: 21 }, // ~111m from start
      { lat: 52.002, lng: 21 }, // ~111m more
    ];
    const { distance } = accumulateTrackDelta(points, start, 1, 1);
    expect(distance).toBeGreaterThan(220);
    expect(distance).toBeLessThan(224);
  });

  it('ignores segments below the distance threshold (jitter)', () => {
    const start = { lat: 52, lng: 21 };
    // ~1m apart — below a 5m threshold
    const points = [{ lat: 52.00001, lng: 21 }];
    expect(accumulateTrackDelta(points, start, 5, 1).distance).toBe(0);
  });

  it('counts only positive elevation gain above the threshold', () => {
    const start = { lat: 52, lng: 21, ele: 100 };
    const points = [
      { lat: 52.001, lng: 21, ele: 110 }, // +10 (counts)
      { lat: 52.002, lng: 21, ele: 108 }, // -2 (ignored, descent)
      { lat: 52.003, lng: 21, ele: 108.5 }, // +0.5 below threshold (ignored)
      { lat: 52.004, lng: 21, ele: 120 }, // +11.5 (counts)
    ];
    const { elevationGain } = accumulateTrackDelta(points, start, 1, 1);
    expect(elevationGain).toBeCloseTo(21.5, 5);
  });

  it('skips elevation when an endpoint lacks one', () => {
    const start = { lat: 52, lng: 21 }; // no ele
    const points = [{ lat: 52.001, lng: 21, ele: 200 }];
    expect(accumulateTrackDelta(points, start, 1, 1).elevationGain).toBe(0);
  });

  it('accumulates nothing useful when there is no start point and one point', () => {
    // With a null start, the first point becomes prev with no distance counted.
    const { distance } = accumulateTrackDelta([{ lat: 52, lng: 21 }], null, 1, 1);
    expect(distance).toBe(0);
  });
});