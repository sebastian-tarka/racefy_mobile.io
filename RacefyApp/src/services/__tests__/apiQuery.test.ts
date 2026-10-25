import { withQuery } from '../api/query';

describe('withQuery', () => {
  it('keeps key order and encodes like URLSearchParams', () => {
    expect(withQuery('/routes/search', { query: 'Park Run & co', page: 2 })).toBe(
      '/routes/search?query=Park+Run+%26+co&page=2',
    );
  });

  it('leaves out undefined, null, empty strings and 0', () => {
    expect(
      withQuery('/events', { user_id: undefined, status: '', sport_type_id: 0, page: null }),
    ).toBe('/events');
  });

  it('sends 0 given as a string', () => {
    expect(
      withQuery('/leaderboard/global', { period: 'week', limit: '50', offset: String(0) }),
    ).toBe('/leaderboard/global?period=week&limit=50&offset=0');
    expect(withQuery('/routes/search', { lat: (0).toString(), lng: undefined })).toBe(
      '/routes/search?lat=0',
    );
  });

  // The guards it replaced, e.g. getEvents / getLiveBroadcasts before the migration.
  const truthyGuards = (p: { user_id?: number; status?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (p.user_id) query.append('user_id', String(p.user_id));
    if (p.status) query.append('status', p.status);
    if (p.page) query.append('page', String(p.page));
    const qs = query.toString();
    return `/events${qs ? `?${qs}` : ''}`;
  };
  const nullGuards = (p: { user_id?: number | null; page?: number | null }) => {
    const query = new URLSearchParams();
    if (p.user_id != null) query.append('user_id', String(p.user_id));
    if (p.page != null) query.append('page', String(p.page));
    const qs = query.toString();
    return `/live${qs ? `?${qs}` : ''}`;
  };

  it.each([
    {},
    { user_id: 7 },
    { user_id: 0, status: '', page: 0 },
    { status: 'upcoming finished', page: 3 },
    { user_id: 12, status: 'ongoing', page: 1 },
  ])('matches the old `if (x)` guards for %j', (p) => {
    expect(withQuery('/events', { user_id: p.user_id, status: p.status, page: p.page })).toBe(
      truthyGuards(p),
    );
  });

  it.each([{}, { user_id: 0 }, { user_id: 5, page: 0 }, { user_id: null, page: 2 }])(
    'matches the old `!= null` guards via ?.toString() for %j',
    (p) => {
      expect(withQuery('/live', { user_id: p.user_id?.toString(), page: p.page?.toString() })).toBe(
        nullGuards(p),
      );
    },
  );
});
