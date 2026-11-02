/**
 * The user's time zone (time zone plan, phase 1 — API docs/plans/2026-11-02-timezones.md).
 *
 * The phone's IANA zone goes out in an `X-Timezone` header on every request;
 * the server keeps it in `preferences.timezone` while `timezone_auto` is on,
 * so app start, focus, travel and a changed phone setting all take effect with
 * no extra call. Read per request, never cached at startup, for the same reason.
 */

export type TimeZoneChoice = { auto: true } | { auto: false; zone: string };

export function getDeviceTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && isValidTimeZone(zone)) return zone;
  } catch {
    // Hermes without Intl data, or a zone the runtime cannot name.
  }
  return 'UTC';
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
  if (!zones.includes(device)) zones.push(device);
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
