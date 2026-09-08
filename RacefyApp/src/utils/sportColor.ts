/**
 * One colour per sport, lifted from the design's sport catalogue
 * ("Racefy v2" → SPORT_CATALOG / STAT_SPORTS).
 *
 * Charts and filters need a sport to keep the same colour wherever it appears,
 * so this is keyed on the slug rather than on list position. Anything the
 * catalogue does not name still gets a stable colour, picked from the same
 * palette by id — never grey, because a bar nobody can tell apart from the next
 * one is the problem this solves.
 */
const BY_SLUG: Record<string, string> = {
  running: '#10B981',
  run: '#10B981',
  jogging: '#10B981',
  'trail-running': '#059669',
  trail_running: '#059669',
  cycling: '#F59E0B',
  bike: '#F59E0B',
  biking: '#F59E0B',
  'road-cycling': '#F59E0B',
  ebike: '#D97706',
  'e-bike': '#D97706',
  mtb: '#B45309',
  'mountain-biking': '#B45309',
  walking: '#0EA5E9',
  walk: '#0EA5E9',
  'nordic-walking': '#0284C7',
  nordic: '#0284C7',
  hiking: '#8B5CF6',
  hike: '#8B5CF6',
  trekking: '#8B5CF6',
  swimming: '#06B6D4',
  swim: '#06B6D4',
  gym: '#EF4444',
  strength: '#EF4444',
  'strength-training': '#EF4444',
  fitness: '#EF4444',
  yoga: '#F472B6',
  pilates: '#F472B6',
  mobility: '#F472B6',
  skating: '#EC4899',
  skateboarding: '#EC4899',
  'inline-skating': '#EC4899',
  skiing: '#38BDF8',
  ski: '#38BDF8',
  horse: '#A16207',
  horseback: '#A16207',
  tennis: '#14B8A6',
  padel: '#0891B2',
  basketball: '#F97316',
  football: '#22C55E',
  soccer: '#22C55E',
};

/** Fallback palette for sports the catalogue above does not name. */
const PALETTE = ['#10B981', '#F59E0B', '#0EA5E9', '#8B5CF6', '#06B6D4', '#EF4444', '#EC4899'];

export function sportColor(sport?: { slug?: string | null; id?: number } | null): string {
  const slug = sport?.slug?.toLowerCase().trim();
  if (slug && BY_SLUG[slug]) return BY_SLUG[slug];
  if (slug) {
    // "Trail Running" style names arrive as multi-word slugs too.
    for (const part of slug.split(/[\s_/-]+/)) {
      if (BY_SLUG[part]) return BY_SLUG[part];
    }
  }
  return PALETTE[Math.abs(sport?.id ?? 0) % PALETTE.length];
}
