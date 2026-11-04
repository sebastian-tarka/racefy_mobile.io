import { Dimensions, PixelRatio } from 'react-native';
import type { ImageVariants } from '../types/api';

type VariantKey = keyof ImageVariants;

/**
 * Width in px of each variant, largest last. Variants never upscale, so a step may be
 * missing on a small original — `pickVariantForWidth` then takes the largest present.
 * See docs/api/mobile/API_ENDPOINTS.md "Image variants (all kinds)".
 */
type VariantLadder = readonly (readonly [VariantKey, number])[];

/** Avatars (users and teams): square crops. */
export const AVATAR_LADDER: VariantLadder = [
  ['thumb', 50],
  ['small', 100],
  ['medium', 200],
];

/** Photos on posts, activities, comments and events (`thumb` is a square crop). */
export const PHOTO_LADDER: VariantLadder = [
  ['thumb', 150],
  ['small', 320],
  ['medium', 640],
  ['large', 1024],
  ['xlarge', 2048],
];

/** Event and team covers, video thumbnails, static route maps. */
const COVER_LADDER: VariantLadder = [
  ['thumb', 150],
  ['small', 320],
  ['medium', 640],
  ['large', 1024],
];

/** User profile backgrounds. */
const BACKGROUND_LADDER: VariantLadder = [
  ['small', 640],
  ['medium', 1280],
  ['large', 1920],
];

/**
 * First variant present in `preferred` order, else `fallback` (the original URL).
 * The map is `null` until the background job has run, and a key may be missing when the
 * original was smaller than that size — both fall through to the original.
 */
export function pickVariant(
  variants: ImageVariants | null | undefined,
  preferred: readonly VariantKey[],
  fallback: string | null | undefined,
): string | null {
  if (variants) {
    for (const key of preferred) {
      const url = variants[key];
      if (url) return url;
    }
  }
  return fallback ?? null;
}

/**
 * Smallest variant that still covers `widthPt` on this screen (points × pixel ratio),
 * else the largest variant present, else `fallback`.
 */
export function pickVariantForWidth(
  variants: ImageVariants | null | undefined,
  widthPt: number,
  ladder: VariantLadder,
  fallback: string | null | undefined,
): string | null {
  if (!variants) return fallback ?? null;
  const neededPx = widthPt * PixelRatio.get();
  let largest: string | null = null;
  for (const [key, px] of ladder) {
    const url = variants[key];
    if (!url) continue;
    if (px >= neededPx) return url;
    largest = url;
  }
  return largest ?? fallback ?? null;
}

/** Full-screen photo: the biggest copy, or the original when none exists yet. */
export function pickFullSizeUrl(
  variants: ImageVariants | null | undefined,
  fallback: string | null | undefined,
): string | null {
  return pickVariant(variants, ['xlarge', 'large'], fallback);
}

/** An image that spans the whole window width (card hero, profile background, route map). */
function pickFullWidthUrl(
  variants: ImageVariants | null | undefined,
  ladder: VariantLadder,
  fallback: string | null | undefined,
): string | null {
  return pickVariantForWidth(variants, Dimensions.get('window').width, ladder, fallback);
}

/** Static route map of an activity or GPS track, sized for a full-width card. */
export function pickRouteMapUrl(
  source:
    | { route_map_url?: string | null; route_map_variants?: ImageVariants | null }
    | null
    | undefined,
): string | null {
  return pickFullWidthUrl(source?.route_map_variants, COVER_LADDER, source?.route_map_url);
}

/** Profile background, sized for the window width. */
export function pickBackgroundUrl(
  user:
    | { background_image_url?: string | null; background_variants?: ImageVariants | null }
    | null
    | undefined,
): string | null {
  return pickFullWidthUrl(user?.background_variants, BACKGROUND_LADDER, user?.background_image_url);
}
