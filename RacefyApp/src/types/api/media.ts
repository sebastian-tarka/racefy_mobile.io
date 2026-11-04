// ============ PHOTOS & MEDIA ============

/**
 * Downscaled WebP copies served next to an original URL (docs/api/mobile/API_ENDPOINTS.md,
 * "Image variants (all kinds)"). Which keys exist depends on the kind: avatars have
 * `thumb` 50 / `small` 100 / `medium` 200, photos `thumb` 150 / `small` 320 / `medium` 640 /
 * `large` 1024 / `xlarge` 2048, backgrounds `small` 640 / `medium` 1280 / `large` 1920,
 * AI covers also `mobile` 640×960. Widths never upscale, the map is `null` until the
 * background job has run and a key may be missing — always fall back to the original.
 * Pick with `utils/imageVariants`. There is no `thumbnail` or `original` key.
 */
export interface ImageVariants {
  thumb?: string;
  small?: string;
  medium?: string;
  large?: string;
  xlarge?: string;
  mobile?: string;
}

export interface Photo {
  id: number;
  user_id: number;
  /** Position within the owner's media set; continuous across post + activity. */
  order?: number;
  path: string;
  filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  caption: string | null;
  url: string;
  variants?: ImageVariants | null;
}

export interface Media {
  id: number;
  user_id: number;
  type: 'image' | 'video';
  path: string;
  filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null; // video duration in seconds
  thumbnail_url: string | null; // video thumbnail
  caption: string | null;
  url: string;
  /** Images only. */
  variants?: ImageVariants | null;
  /** Videos only: downscaled copies of `thumbnail_url`. */
  thumbnail_variants?: ImageVariants | null;
}

export interface Video {
  id: number;
  url: string;
  thumbnail_url: string | null;
  /** `thumb` 150 / `small` 320 / `medium` 640 copies of `thumbnail_url`. */
  thumbnail_variants?: ImageVariants | null;
  filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  caption: string | null;
  order: number;
  created_at: string;
}

// Local media item for picking/uploading
export interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  duration?: number;
  width?: number;
  height?: number;
}
