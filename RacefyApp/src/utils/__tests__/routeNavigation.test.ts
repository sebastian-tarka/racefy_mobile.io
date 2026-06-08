import { haversine, routeTotalDistance } from '../routeNavigation';

// Guards the [lng, lat] coordinate mapping while routeNavigation's bespoke
// Haversine is consolidated onto utils/gpsMath.
describe('routeNavigation.haversine ([lng, lat] tuples)', () => {
  it('is zero for identical points', () => {
    expect(haversine([21.0122, 52.2297], [21.0122, 52.2297])).toBe(0);
  });

  it('approximates Warsaw–Krakow (~252 km)', () => {
    const km = haversine([21.0122, 52.2297], [19.945, 50.0647]) / 1000;
    expect(km).toBeGreaterThan(245);
    expect(km).toBeLessThan(260);
  });

  it('is symmetric', () => {
    const a = haversine([21, 52], [19, 50]);
    const b = haversine([19, 50], [21, 52]);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('routeTotalDistance', () => {
  it('sums consecutive segments', () => {
    const total = routeTotalDistance([
      [21, 52],
      [21.001, 52],
      [21.001, 52.001],
    ]);
    // ~68m (lng @ lat52) + ~111m (lat) ≈ 179m
    expect(total).toBeGreaterThan(150);
    expect(total).toBeLessThan(200);
  });

  it('is zero for a single point', () => {
    expect(routeTotalDistance([[21, 52]])).toBe(0);
  });
});