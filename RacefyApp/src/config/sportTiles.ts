import type { ImageSourcePropType } from 'react-native';

/**
 * Illustrated sport tiles (assets/sports), one set per theme. Cut from the
 * brand sheet — square, 256 px, caption removed (the app renders its own
 * translated name on top).
 *
 * Keyed by API sport slug; aliases cover the variants the icon map already
 * knows about. Anything unknown gets the "R" fallback tile, so a sport added
 * on the backend never renders as a broken image.
 */

const DARK = {
  fallback: require('../../assets/sports/dark/fallback.jpg'),
  walking: require('../../assets/sports/dark/walking.jpg'),
  running: require('../../assets/sports/dark/running.jpg'),
  cycling: require('../../assets/sports/dark/cycling.jpg'),
  hiking: require('../../assets/sports/dark/hiking.jpg'),
  swimming: require('../../assets/sports/dark/swimming.jpg'),
  gym: require('../../assets/sports/dark/gym.jpg'),
  yoga: require('../../assets/sports/dark/yoga.jpg'),
  tennis: require('../../assets/sports/dark/tennis.jpg'),
  basketball: require('../../assets/sports/dark/basketball.jpg'),
  football: require('../../assets/sports/dark/football.jpg'),
  padel: require('../../assets/sports/dark/padel.jpg'),
  skateboarding: require('../../assets/sports/dark/skateboarding.jpg'),
} as const;

const LIGHT: Record<keyof typeof DARK, ImageSourcePropType> = {
  fallback: require('../../assets/sports/light/fallback.jpg'),
  walking: require('../../assets/sports/light/walking.jpg'),
  running: require('../../assets/sports/light/running.jpg'),
  cycling: require('../../assets/sports/light/cycling.jpg'),
  hiking: require('../../assets/sports/light/hiking.jpg'),
  swimming: require('../../assets/sports/light/swimming.jpg'),
  gym: require('../../assets/sports/light/gym.jpg'),
  yoga: require('../../assets/sports/light/yoga.jpg'),
  tennis: require('../../assets/sports/light/tennis.jpg'),
  basketball: require('../../assets/sports/light/basketball.jpg'),
  football: require('../../assets/sports/light/football.jpg'),
  padel: require('../../assets/sports/light/padel.jpg'),
  skateboarding: require('../../assets/sports/light/skateboarding.jpg'),
};

type TileKey = keyof typeof DARK;

/** Slug / name variants → tile. Lower-case keys. */
const ALIASES: Record<string, TileKey> = {
  run: 'running',
  running: 'running',
  'trail-running': 'running',
  trail_running: 'running',
  jogging: 'running',
  bike: 'cycling',
  biking: 'cycling',
  cycling: 'cycling',
  'road-cycling': 'cycling',
  'mountain-biking': 'cycling',
  mtb: 'cycling',
  swim: 'swimming',
  swimming: 'swimming',
  hike: 'hiking',
  hiking: 'hiking',
  trekking: 'hiking',
  walk: 'walking',
  walking: 'walking',
  'nordic-walking': 'walking',
  gym: 'gym',
  fitness: 'gym',
  workout: 'gym',
  strength: 'gym',
  crossfit: 'gym',
  yoga: 'yoga',
  pilates: 'yoga',
  stretching: 'yoga',
  mobility: 'yoga',
  tennis: 'tennis',
  basketball: 'basketball',
  football: 'football',
  soccer: 'football',
  padel: 'padel',
  squash: 'padel',
  badminton: 'tennis',
  skateboarding: 'skateboarding',
  skateboard: 'skateboarding',
  skating: 'skateboarding',
  'inline-skating': 'skateboarding',
};

function resolveKey(slugOrName: string | null | undefined): TileKey {
  if (!slugOrName) return 'fallback';
  const key = slugOrName.toLowerCase().trim();
  if (ALIASES[key]) return ALIASES[key];
  // "Trail Running", "road cycling" → try each word
  for (const part of key.split(/[\s_/-]+/)) {
    if (ALIASES[part]) return ALIASES[part];
  }
  return 'fallback';
}

/** Tile image for a sport, matching the active theme. */
export function getSportTile(
  sport: { slug?: string | null; name?: string | null },
  isDark: boolean,
): ImageSourcePropType {
  const key =
    resolveKey(sport.slug) === 'fallback' ? resolveKey(sport.name) : resolveKey(sport.slug);
  return (isDark ? DARK : LIGHT)[key];
}

/** True when the sport has its own illustration (not the fallback). */
export function hasSportTile(sport: { slug?: string | null; name?: string | null }): boolean {
  return resolveKey(sport.slug) !== 'fallback' || resolveKey(sport.name) !== 'fallback';
}
