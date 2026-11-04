import type { TFunction } from 'i18next';
import { fixStorageUrl } from '../../config/api';
import type { Event, EventRankingMode, ImageVariants } from '../../types/api';
import { pickVariant } from '../../utils/imageVariants';

/**
 * Best cover image URL for mobile: prefer a variant (`mobile` 640×960 exists only on AI
 * covers, otherwise `medium` 640 → `large` 1024, then whatever size is there), then the
 * full cover, then the first post photo. Works for the full `Event` as well as the slim
 * home-section event shape. A variants map holding storage paths instead of URLs (what
 * `/home` sends) is skipped by `pickVariant`, so the cover still shows — as the original.
 */
export function pickEventCoverUrl(event: {
  cover_variants?: ImageVariants | null;
  cover_image_url?: string | null;
  post?: Event['post'];
}): string | null {
  const variant = pickVariant(
    event.cover_variants,
    ['mobile', 'medium', 'large', 'xlarge', 'small', 'thumb'],
    null,
  );
  if (variant) return fixStorageUrl(variant);
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

/** Format a time-limit / cut-off given in seconds as `H:MM`. */
export function formatCutoff(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const totalMinutes = Math.round(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}
