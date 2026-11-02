/**
 * The user's time zone (time zone plan, phase 1 — API docs/plans/2026-11-02-timezones.md).
 *
 * The phone's IANA zone goes out in an `X-Timezone` header on every request;
 * the server keeps it in `preferences.timezone` while `timezone_auto` is on,
 * so app start, focus, travel and a changed phone setting all take effect with
 * no extra call. Read per request, never cached at startup, for the same reason.
 *
 * Unknown zone = no header and no login field, never 'UTC': the server writes
 * only on a change, and a 'UTC' would overwrite a zone it already knows.
 */

export type TimeZoneChoice = { auto: true } | { auto: false; zone: string };

/** The phone's IANA zone, or null when the runtime cannot say. */
export function getDeviceTimeZone(): string | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && zone !== 'UTC' && isValidTimeZone(zone)) return zone;
  } catch {
    // Hermes without Intl data, or a zone the runtime cannot name.
  }
  return null;
}

export function isValidTimeZone(zone: string): boolean {
  if (!zone || !/^[A-Za-z0-9_+\-/]+$/.test(zone)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The body for PUT /profile/preferences: by hand = zone + auto off; automatic = auto on (server takes X-Timezone). */
export function timeZonePayload(choice: TimeZoneChoice): Record<string, unknown> {
  return choice.auto ? { timezone_auto: true } : { timezone: choice.zone, timezone_auto: false };
}

/**
 * Every IANA zone the runtime knows, or a bundled list where it cannot say
 * (`Intl.supportedValuesOf` is not in every Hermes). The device's zone is
 * always on the list, so the current choice can be shown as selected.
 */
export function listTimeZones(): string[] {
  let zones: string[] = [];
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
      .supportedValuesOf;
    zones = supported ? supported.call(Intl, 'timeZone') : [];
  } catch {
    zones = [];
  }
  if (zones.length === 0) zones = [...FALLBACK_ZONES];
  const device = getDeviceTimeZone();
  if (device && !zones.includes(device)) zones.push(device);
  return Array.from(new Set(zones)).sort((a, b) => a.localeCompare(b));
}

/** Case- and underscore-insensitive match on any part of the zone name. */
export function filterTimeZones(zones: string[], query: string): string[] {
  const needle = normalizeZoneText(query);
  if (!needle) return zones;
  return zones.filter((zone) => normalizeZoneText(zone).includes(needle));
}

function normalizeZoneText(text: string): string {
  return text.toLowerCase().replace(/[_/]/g, ' ').trim();
}

/** "Europe/Warsaw" → "Warsaw · Europe"; the current UTC offset where the runtime can give it. */
export function formatTimeZone(zone: string, at: Date = new Date()): string {
  const parts = zone.split('/');
  const city = (parts.length > 1 ? parts.slice(1).join(' / ') : zone).replace(/_/g, ' ');
  const region = parts.length > 1 ? parts[0].replace(/_/g, ' ') : null;
  const offset = utcOffsetLabel(zone, at);
  return [region ? `${city} · ${region}` : city, offset].filter(Boolean).join(' · ');
}

function utcOffsetLabel(zone: string, at: Date): string | null {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName');
    return part?.value ?? null;
  } catch {
    return null;
  }
}

const FALLBACK_ZONES = [
  'UTC',
  'Europe/Warsaw',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Lisbon',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/Brussels',
  'Europe/Amsterdam',
  'Europe/Berlin',
  'Europe/Zurich',
  'Europe/Rome',
  'Europe/Vienna',
  'Europe/Prague',
  'Europe/Budapest',
  'Europe/Copenhagen',
  'Europe/Oslo',
  'Europe/Stockholm',
  'Europe/Helsinki',
  'Europe/Vilnius',
  'Europe/Riga',
  'Europe/Tallinn',
  'Europe/Kyiv',
  'Europe/Athens',
  'Europe/Bucharest',
  'Europe/Sofia',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Europe/Minsk',
  'Atlantic/Reykjavik',
  'Atlantic/Canary',
  'Atlantic/Azores',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Casablanca',
  'Asia/Dubai',
  'Asia/Tel_Aviv',
  'Asia/Tehran',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Taipei',
  'Asia/Manila',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Asia/Tashkent',
  'Asia/Almaty',
  'Asia/Yerevan',
  'Asia/Tbilisi',
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Pacific/Honolulu',
  'Pacific/Fiji',
  'America/Anchorage',
  'America/Los_Angeles',
  'America/Vancouver',
  'America/Denver',
  'America/Phoenix',
  'America/Chicago',
  'America/Mexico_City',
  'America/New_York',
  'America/Toronto',
  'America/Halifax',
  'America/Bogota',
  'America/Lima',
  'America/Caracas',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Montevideo',
];

// ---------------------------------------------------------------------------
// Wall clock in a zone (time zone plan, phase 2 — the event's own zone)
//
// The native date pickers work in the device's zone. An event in another zone
// is edited as its *wall clock*: the picker shows "10:00" for a 10:00 start in
// New York even when the phone is in Warsaw. These helpers move between that
// wall clock and the real instant the API stores.
// ---------------------------------------------------------------------------

interface WallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** The wall clock an instant shows in `zone`. */
export function zonedWallClock(instant: Date, zone: string): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
    second: get('second'),
  };
}

const asUtcMs = (w: WallClock) => Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);

/** The instant at which `zone` shows this wall clock (a DST gap resolves forward). */
export function zonedWallClockToInstant(wall: WallClock, zone: string): Date {
  const target = asUtcMs(wall);
  let guess = target;
  // Two passes: the first offset may be taken from the wrong side of a DST switch.
  for (let i = 0; i < 2; i++) {
    const shown = asUtcMs(zonedWallClock(new Date(guess), zone));
    if (shown === target) break;
    guess -= shown - target;
  }
  return new Date(guess);
}

/** A device-local Date whose local fields read as the instant's wall clock in `zone` (for pickers). */
export function toLocalWallClock(instant: Date, zone: string): Date {
  if (Number.isNaN(instant.getTime())) return instant;
  const w = zonedWallClock(instant, zone);
  return new Date(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
}

/** The instant for a picker Date read as a wall clock in `zone` (inverse of toLocalWallClock). */
export function fromLocalWallClock(local: Date, zone: string): Date {
  if (Number.isNaN(local.getTime())) return local;
  return zonedWallClockToInstant(
    {
      year: local.getFullYear(),
      month: local.getMonth() + 1,
      day: local.getDate(),
      hour: local.getHours(),
      minute: local.getMinutes(),
      second: local.getSeconds(),
    },
    zone,
  );
}

/** "America/New_York" → "New York". */
export function timeZoneCity(zone: string): string {
  return (zone.split('/').pop() ?? zone).replace(/_/g, ' ');
}

/**
 * The "Event local time" line for a detail screen: the start as read in the
 * event's zone, when that differs from what the device shows. Null when the
 * two wall clocks agree (same zone, or zones with the same offset right then).
 */
export function eventLocalTimeLine(
  instant: Date,
  eventZone: string | null | undefined,
  deviceZone: string | null,
  locale: string,
): { time: string; city: string } | null {
  if (!eventZone || !isValidTimeZone(eventZone)) return null;
  const device = deviceZone && isValidTimeZone(deviceZone) ? deviceZone : null;
  if (device) {
    const a = zonedWallClock(instant, eventZone);
    const b = zonedWallClock(instant, device);
    if (asUtcMs(a) === asUtcMs(b)) return null;
  }
  let time: string;
  try {
    time = new Intl.DateTimeFormat(locale, {
      timeZone: eventZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(instant);
  } catch {
    return null;
  }
  return { time, city: timeZoneCity(eventZone) };
}
