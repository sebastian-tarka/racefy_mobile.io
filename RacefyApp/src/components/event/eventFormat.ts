import type { TFunction } from 'i18next';
import { fixStorageUrl } from '../../config/api';
import type { Event, EventRankingMode } from '../../types/api';
import type { ThemeColors } from '../../theme/colors';

/** Best cover image URL for mobile: prefer a variant, then the full cover, then first post photo. */
export function pickEventCoverUrl(
  event: Pick<Event, 'cover_variants' | 'cover_image_url' | 'post'>,
): string | null {
  const variants = event.cover_variants;
  if (variants) {
    const preferred =
      variants.mobile ?? variants.medium ?? variants.large ?? Object.values(variants)[0];
    if (preferred) return fixStorageUrl(preferred);
  }
  if (event.cover_image_url) return fixStorageUrl(event.cover_image_url);
  const photo = event.post?.photos?.[0]?.url;
  return photo ? fixStorageUrl(photo) : null;
}

const RANKING_MODE_KEYS: Record<EventRankingMode, string> = {
  fastest_time: 'eventRanking.fastestTime',
  most_distance: 'eventRanking.mostDistance',
  most_elevation: 'eventRanking.mostElevation',
  first_finish: 'eventRanking.firstFinish',
};

/** Translate a ranking mode to a short label, e.g. "Fastest time". */
export function rankingModeLabel(mode: EventRankingMode | undefined, t: TFunction): string | null {
  if (!mode) return null;
  const key = RANKING_MODE_KEYS[mode];
  if (!key) return null;
  const fallback = mode
    .split('_')
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
  return t(key, { defaultValue: fallback });
}

export function difficultyColor(difficulty: Event['difficulty'], colors: ThemeColors): string {
  switch (difficulty) {
    case 'beginner':
      return colors.success;
    case 'intermediate':
      return colors.warning;
    case 'advanced':
      return colors.error;
    default:
      return colors.primary;
  }
}

/** Format a time-limit / cut-off given in seconds as `H:MM`. */
export function formatCutoff(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const totalMinutes = Math.round(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}
