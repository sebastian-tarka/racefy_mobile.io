import { haversineDistance, smoothPositionFromBuffer } from '../gpsMath';

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