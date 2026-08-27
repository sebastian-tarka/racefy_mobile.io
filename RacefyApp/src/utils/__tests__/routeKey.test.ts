import { routeKey } from '../routeKey';

describe('routeKey', () => {
  it('defaults missing source to activity', () => {
    expect(routeKey({ id: 5 })).toBe('activity:5');
    expect(routeKey({ id: 5, source: 'activity' })).toBe('activity:5');
  });

  it('separates same numeric id across sources', () => {
    const keys = new Set([
      routeKey({ id: 5 }),
      routeKey({ id: 5, source: 'planned_route' }),
      routeKey({ id: 5, source: 'event' }),
    ]);
    expect(keys.size).toBe(3);
  });
});
