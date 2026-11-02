import {
  eventLocalTimeLine,
  filterTimeZones,
  formatTimeZone,
  fromLocalWallClock,
  getDeviceTimeZone,
  isValidTimeZone,
  listTimeZones,
  timeZoneCity,
  timeZonePayload,
  toLocalWallClock,
  zonedWallClock,
  zonedWallClockToInstant,
} from '../timezone';

describe('timezone', () => {
  it('reports the runtime zone, or null (never "UTC") when it cannot say', () => {
    const zone = getDeviceTimeZone();
    if (zone === null) {
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone === 'UTC').toBe(true);
    } else {
      expect(zone).not.toBe('UTC');
      expect(isValidTimeZone(zone)).toBe(true);
    }
  });

  it('is null when the runtime reports UTC or throws', () => {
    const spy = jest.spyOn(Intl, 'DateTimeFormat');
    spy.mockImplementation((() => ({ resolvedOptions: () => ({ timeZone: 'UTC' }) })) as any);
    expect(getDeviceTimeZone()).toBeNull();
    spy.mockImplementation((() => {
      throw new RangeError('no Intl');
    }) as any);
    expect(getDeviceTimeZone()).toBeNull();
    spy.mockRestore();
  });

  it('accepts IANA names and rejects junk', () => {
    expect(isValidTimeZone('Europe/Warsaw')).toBe(true);
    expect(isValidTimeZone('America/Argentina/Buenos_Aires')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone('Europe/Warsaw; DROP')).toBe(false);
  });

  it('builds the preferences body: by hand = zone + auto off, automatic = auto on only', () => {
    expect(timeZonePayload({ auto: false, zone: 'America/New_York' })).toEqual({
      timezone: 'America/New_York',
      timezone_auto: false,
    });
    expect(timeZonePayload({ auto: true })).toEqual({ timezone_auto: true });
  });

  it('lists sorted unique zones including the device zone and Warsaw', () => {
    const zones = listTimeZones();
    const device = getDeviceTimeZone();
    if (device) expect(zones).toContain(device);
    expect(zones).toContain('Europe/Warsaw');
    expect(new Set(zones).size).toBe(zones.length);
    expect([...zones].sort((a, b) => a.localeCompare(b))).toEqual(zones);
  });

  it('filters ignoring case, underscores and slashes', () => {
    const zones = ['Europe/Warsaw', 'America/New_York', 'Asia/Hong_Kong'];
    expect(filterTimeZones(zones, 'new york')).toEqual(['America/New_York']);
    expect(filterTimeZones(zones, 'HONG')).toEqual(['Asia/Hong_Kong']);
    expect(filterTimeZones(zones, 'europe wars')).toEqual(['Europe/Warsaw']);
    expect(filterTimeZones(zones, '')).toEqual(zones);
  });

  it('formats a zone as city · region with the current offset', () => {
    const label = formatTimeZone('America/New_York', new Date('2026-07-01T12:00:00Z'));
    expect(label.startsWith('New York · America')).toBe(true);
    expect(label).toContain('GMT-4');
    expect(formatTimeZone('UTC')).toMatch(/^UTC/);
  });
});

describe('wall clock in a zone (F2)', () => {
  it('reads an instant as the wall clock of a zone', () => {
    // 14:00Z on 15 Oct 2026 = 10:00 EDT in New York, 16:00 CEST in Warsaw
    const instant = new Date('2026-10-15T14:00:00.000Z');
    expect(zonedWallClock(instant, 'America/New_York')).toEqual({
      year: 2026,
      month: 10,
      day: 15,
      hour: 10,
      minute: 0,
      second: 0,
    });
    expect(zonedWallClock(instant, 'Europe/Warsaw').hour).toBe(16);
    expect(zonedWallClock(new Date('2026-11-01T23:30:00.000Z'), 'Asia/Tokyo')).toMatchObject({
      day: 2,
      hour: 8,
      minute: 30,
    });
  });

  it('converts a wall clock back to the instant, across the DST change', () => {
    const w = { year: 2026, month: 10, day: 15, hour: 10, minute: 0, second: 0 };
    expect(zonedWallClockToInstant(w, 'America/New_York').toISOString()).toBe(
      '2026-10-15T14:00:00.000Z',
    );
    // Summer time in Warsaw: 10:00 CEST = 08:00Z
    expect(zonedWallClockToInstant({ ...w, month: 7 }, 'Europe/Warsaw').toISOString()).toBe(
      '2026-07-15T08:00:00.000Z',
    );
    // Midnight in Tokyo is the previous day in UTC
    expect(zonedWallClockToInstant({ ...w, hour: 0, day: 16 }, 'Asia/Tokyo').toISOString()).toBe(
      '2026-10-15T15:00:00.000Z',
    );
    // A wall clock inside the spring-forward gap (02:30 on 29 Mar 2026 in Warsaw) resolves forward
    expect(
      zonedWallClockToInstant(
        { year: 2026, month: 3, day: 29, hour: 2, minute: 30, second: 0 },
        'Europe/Warsaw',
      ).toISOString(),
    ).toBe('2026-03-29T01:30:00.000Z');
  });

  it('round-trips through the picker representation', () => {
    for (const zone of ['America/New_York', 'Asia/Kolkata', 'Pacific/Auckland', 'UTC']) {
      for (const iso of [
        '2026-10-15T14:00:00.000Z',
        '2026-07-15T23:45:00.000Z',
        '2026-01-01T00:00:00.000Z',
      ]) {
        const instant = new Date(iso);
        const local = toLocalWallClock(instant, zone);
        const wall = zonedWallClock(instant, zone);
        expect([local.getHours(), local.getMinutes(), local.getDate()]).toEqual([
          wall.hour,
          wall.minute,
          wall.day,
        ]);
        expect(fromLocalWallClock(local, zone).toISOString()).toBe(iso);
      }
    }
  });

  it('names the city from the zone', () => {
    expect(timeZoneCity('America/New_York')).toBe('New York');
    expect(timeZoneCity('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
    expect(timeZoneCity('UTC')).toBe('UTC');
  });

  it('adds the local-time line only when the event clock differs from the device clock', () => {
    const start = new Date('2026-10-15T14:00:00.000Z');
    expect(eventLocalTimeLine(start, 'Europe/Warsaw', 'Europe/Warsaw', 'pl')).toBeNull();
    // Same offset right then (Berlin and Warsaw) → no line, even though the zones differ
    expect(eventLocalTimeLine(start, 'Europe/Berlin', 'Europe/Warsaw', 'pl')).toBeNull();
    const line = eventLocalTimeLine(start, 'America/New_York', 'Europe/Warsaw', 'en');
    expect(line?.city).toBe('New York');
    expect(line?.time).toContain('10:00');
    expect(line?.time).toMatch(/Thu/);
    expect(eventLocalTimeLine(start, undefined, 'Europe/Warsaw', 'pl')).toBeNull();
    expect(eventLocalTimeLine(start, 'Mars/Olympus', 'Europe/Warsaw', 'pl')).toBeNull();
    // Unknown device zone: still show the event's own time
    expect(eventLocalTimeLine(start, 'America/New_York', null, 'en')?.city).toBe('New York');
  });
});
