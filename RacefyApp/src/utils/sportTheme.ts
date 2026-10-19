import { Ionicons } from '@expo/vector-icons';
import { sportColor } from './sportColor';

export interface SportTheme {
  color: string;
  gradient: [string, string];
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/** Icon per sport family; the colour comes from the design palette (sportColor). */
const ICONS: { match: (name: string) => boolean; icon: keyof typeof Ionicons.glyphMap }[] = [
  { match: (n) => n.includes('run') || n.includes('jog'), icon: 'walk' },
  { match: (n) => n.includes('cycl') || n.includes('bike'), icon: 'bicycle' },
  { match: (n) => n.includes('swim'), icon: 'water' },
  {
    match: (n) => n.includes('gym') || n.includes('weight') || n.includes('fitness'),
    icon: 'barbell',
  },
  { match: (n) => n.includes('yoga') || n.includes('pilates'), icon: 'body' },
  {
    match: (n) => n.includes('hik') || n.includes('walk') || n.includes('trek'),
    icon: 'trail-sign',
  },
];

/** Mix a #RRGGBB colour towards black (amount < 0) or white (amount > 0). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (target - c) * t);
  const r = mix((n >> 16) & 0xff);
  const g = mix((n >> 8) & 0xff);
  const b = mix(n & 0xff);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * Colour, gradient, accent and icon for a sport. The colour is the design palette's
 * (utils/sportColor — "Racefy v2"), so a sport looks the same on Home cards as in the
 * profile charts and filters; gradient and accent are darker/lighter shades of it.
 */
export function getSportTheme(
  sport?: { slug?: string | null; name?: string | null; id?: number } | null,
): SportTheme {
  const color = sportColor({ slug: sport?.slug ?? sport?.name, id: sport?.id });
  // Icons were always matched on the display name ("Mountain bike" → bicycle); the slug
  // alone ("mtb") would miss that, so both are searched.
  const name = `${sport?.slug ?? ''} ${sport?.name ?? ''}`.toLowerCase();
  return {
    color,
    gradient: [color, shade(color, -0.2)],
    accent: shade(color, 0.25),
    icon: ICONS.find((i) => i.match(name))?.icon ?? 'fitness',
  };
}
