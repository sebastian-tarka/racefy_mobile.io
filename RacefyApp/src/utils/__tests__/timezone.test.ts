import {
  filterTimeZones,
  formatTimeZone,
  getDeviceTimeZone,
  isValidTimeZone,
  listTimeZones,
  timeZonePayload,
} from '../timezone';

describe('timezone', () => {
  it('reports the runtime zone and never an empty string', () => {
    const zone = getDeviceTimeZone();
    expect(zone.length).toBeGreaterThan(0);
    expect(isValidTimeZone(zone)).toBe(true);
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
    expect(zones).toContain(getDeviceTimeZone());
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
