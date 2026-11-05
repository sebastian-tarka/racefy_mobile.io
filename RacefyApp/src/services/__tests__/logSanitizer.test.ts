import { sanitizeContext, sanitizeString } from '../logSanitizer';

/** As a release build would store it. */
const release = (context: Record<string, any>) =>
  sanitizeContext(context, { preciseCoordinates: false });

describe('sanitizeString', () => {
  it('removes a Sanctum token, whole', () => {
    const token = `12|${'aB3'.repeat(16)}`;

    expect(sanitizeString(`login ok, token ${token}`)).toBe('login ok, token [TOKEN_REDACTED]');
    expect(sanitizeString(`Authorization: Bearer ${token}`)).toBe(
      'Authorization: Bearer [REDACTED]',
    );
  });

  it('removes a JWT, also after Bearer', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl';

    expect(sanitizeString(`got ${jwt}`)).toBe('got [JWT_REDACTED]');
    expect(sanitizeString(`Bearer ${jwt}`)).toBe('Bearer [REDACTED]');
  });

  it('removes e-mail addresses from free text', () => {
    expect(sanitizeString('User jan.kowalski+test@example.co.uk not found')).toBe(
      'User [EMAIL] not found',
    );
  });

  it('removes secrets carried in a URL and keeps the rest of it', () => {
    expect(
      sanitizeString('GET https://racefy.io/reset-password?token=abc123&email=a@b.pl&lang=pl'),
    ).toBe('GET https://racefy.io/reset-password?token=[REDACTED]&email=[EMAIL]&lang=pl');
    expect(sanitizeString('https://cdn.racefy.io/a.jpg?expires=1&signature=deadbeef')).toBe(
      'https://cdn.racefy.io/a.jpg?expires=1&signature=[REDACTED]',
    );
  });

  it('leaves ordinary text alone', () => {
    const text = 'Synced 12 points for activity 345 in 1.2s (3|2 retries) @ 10:15';
    expect(sanitizeString(text)).toBe(text);
  });
});

describe('sanitizeContext', () => {
  it('redacts secrets by field name, at any depth', () => {
    expect(
      release({
        password: 'hunter2',
        headers: { Authorization: 'Bearer x', 'X-Api-Key': 'k' },
        nested: [{ refresh_token: 't', ok: 1 }],
      }),
    ).toEqual({
      password: '[REDACTED]',
      headers: { Authorization: '[REDACTED]', 'X-Api-Key': '[REDACTED]' },
      nested: [{ refresh_token: '[REDACTED]', ok: 1 }],
    });
  });

  it('replaces contact data by its length', () => {
    expect(release({ email: 'jan@example.com', phoneNumber: '+48123456789' })).toEqual({
      email: '[REDACTED:15 chars]',
      phoneNumber: '[REDACTED:12 chars]',
    });
  });

  it('cleans strings under harmless field names too', () => {
    expect(release({ note: 'sent to jan@example.com', url: '/login?code=xyz' })).toEqual({
      note: 'sent to [EMAIL]',
      url: '/login?code=[REDACTED]',
    });
  });

  it('rounds coordinates to about a kilometre in a release build', () => {
    expect(
      release({
        lat: 52.229676,
        lng: 21.012229,
        accuracy: 4.7,
        coords: { latitude: 52.229676, longitude: 21.012229, altitude: 113.4, speed: 2.91 },
        start_lat: -33.868819,
        lastLon: 151.209295,
      }),
    ).toEqual({
      lat: 52.23,
      lng: 21.01,
      accuracy: 4.7,
      coords: { latitude: 52.23, longitude: 21.01, altitude: 113.4, speed: 2.91 },
      start_lat: -33.87,
      lastLon: 151.21,
    });
  });

  it('rounds coordinate lists: GeoJSON, map centre, bounding box', () => {
    expect(
      release({
        center: [21.012229, 52.229676],
        geometry: {
          type: 'LineString',
          coordinates: [
            [21.012229, 52.229676],
            [21.015551, 52.231118],
          ],
        },
      }),
    ).toEqual({
      center: [21.01, 52.23],
      geometry: {
        type: 'LineString',
        coordinates: [
          [21.01, 52.23],
          [21.02, 52.23],
        ],
      },
    });
  });

  it('drops a coordinate that is not a number rather than guess at it', () => {
    expect(release({ lat: '52.229676', lng: null })).toEqual({ lat: '[REDACTED]', lng: null });
  });

  it('does not mistake other fields for coordinates', () => {
    const context = { flat: 1.23456, plan: 9.87654, belongs: 3.14159, latency: 12.3456 };
    expect(release(context)).toEqual(context);
  });

  it('keeps exact coordinates in development', () => {
    const context = { lat: 52.229676, lng: 21.012229, coordinates: [21.012229, 52.229676] };

    expect(sanitizeContext(context, { preciseCoordinates: true })).toEqual(context);
    // jest runs with __DEV__ on — the default follows it
    expect(sanitizeContext(context)).toEqual(context);
  });

  it('keeps an error readable without its stack or secrets', () => {
    const error = new Error('401 for jan@example.com');

    expect(release({ error })).toEqual({
      error: { name: 'Error', message: '401 for [EMAIL]', stack: '[STACK_TRACE]' },
    });
  });

  it('survives circular and very deep objects', () => {
    const loop: Record<string, any> = { id: 1 };
    loop.self = loop;

    expect(JSON.stringify(release({ loop }))).toContain('[MAX_DEPTH]');
  });

  it('passes undefined through', () => {
    expect(sanitizeContext(undefined)).toBeUndefined();
  });
});
