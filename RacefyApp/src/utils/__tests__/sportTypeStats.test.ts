import { findSportTypeStat, normalizeSportTypeStats } from '../sportTypeStats';

describe('normalizeSportTypeStats', () => {
  it('reads the list shape, where each entry names itself', () => {
    const rows = normalizeSportTypeStats([
      {
        sport_type_id: 3,
        name: 'Bieganie',
        slug: 'running',
        count: 4,
        distance: 42,
        duration: 900,
      },
      { sport_type_id: 7, name: 'Rower', slug: 'cycling', count: 1, distance: 12, duration: 400 },
    ]);

    expect(rows.map((r) => [r.sportTypeId, r.name])).toEqual([
      [3, 'Bieganie'],
      [7, 'Rower'],
    ]);
  });

  it('reads the old map shape, where the key carried the id', () => {
    const rows = normalizeSportTypeStats({
      '3': { count: 4, distance: 42, duration: 900 },
      '7': { count: 1, distance: 12, duration: 400 },
    });

    expect(rows.map((r) => r.sportTypeId)).toEqual([3, 7]);
  });

  /** The bug this guards: a list read as a map yields keys "0", "1" — ids that
   *  match no sport, so every row rendered as "Other". */
  it('does not mistake list indices for sport-type ids', () => {
    const rows = normalizeSportTypeStats([
      { sport_type_id: 3, name: 'Bieganie', count: 4, distance: 42, duration: 900 },
    ]);

    expect(rows[0].sportTypeId).toBe(3);
  });

  it('drops sports with no activities and survives empty input', () => {
    expect(
      normalizeSportTypeStats([{ sport_type_id: 3, count: 0, distance: 0, duration: 0 }]),
    ).toEqual([]);
    expect(normalizeSportTypeStats(undefined)).toEqual([]);
    expect(normalizeSportTypeStats(null)).toEqual([]);
  });

  it('finds one sport in either shape, and nothing for a null id', () => {
    const list = [{ sport_type_id: 7, name: 'Rower', count: 1, distance: 12, duration: 400 }];
    expect(findSportTypeStat(list, 7)?.name).toBe('Rower');
    expect(findSportTypeStat(list, 3)).toBeUndefined();
    expect(findSportTypeStat(list, null)).toBeUndefined();
    expect(findSportTypeStat({ '7': { count: 1, distance: 12, duration: 400 } }, 7)?.distance).toBe(
      12,
    );
  });
});
