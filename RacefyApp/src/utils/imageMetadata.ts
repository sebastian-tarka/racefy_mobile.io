import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { logger } from '../services/logger';

/**
 * Photos carry more than pixels: EXIF holds where and when they were taken, the
 * device, sometimes the owner's name. A photo from the gallery can pin down a
 * home address to a few metres — exactly what privacy zones hide on the map.
 *
 * The picker's `exif: false` only controls what it hands back to JavaScript; the
 * file it returns still has the metadata, also after its own `quality`
 * compression. So every image the app uploads is decoded and encoded again here,
 * which leaves the pixels and nothing else.
 *
 * Videos cannot be cleaned on the phone (that needs a transcode); the server has
 * to strip their metadata.
 */

export interface LocalImage {
  uri: string;
  width: number;
  height: number;
}

interface StripOptions {
  /** Downscale so the longer side is at most this many pixels. */
  maxSide?: number;
  /** JPEG quality, 0–1. The picker has compressed once already, so stay high. */
  quality?: number;
}

const DEFAULT_QUALITY = 0.9;

/**
 * A copy of the image without metadata, or `null` when it could not be made.
 *
 * `null` means "do not upload this one": falling back to the original would
 * silently send the location this function exists to remove.
 *
 * PNG stays PNG (transparency — avatars, logos); everything else becomes JPEG.
 */
export async function stripImageMetadata(
  image: LocalImage,
  options: StripOptions = {},
): Promise<LocalImage | null> {
  const { maxSide, quality = DEFAULT_QUALITY } = options;
  const format = /\.png$/i.test(image.uri.split(/[?#]/)[0]) ? SaveFormat.PNG : SaveFormat.JPEG;

  try {
    const context = ImageManipulator.manipulate(image.uri);
    const longest = Math.max(image.width, image.height);
    if (maxSide && longest > maxSide) {
      const scale = maxSide / longest;
      context.resize({
        width: Math.round(image.width * scale),
        height: Math.round(image.height * scale),
      });
    }
    const rendered = await context.renderAsync();
    try {
      const saved = await rendered.saveAsync({ compress: quality, format });
      return { uri: saved.uri, width: saved.width, height: saved.height };
    } finally {
      rendered.release();
    }
  } catch (error) {
    logger.warn('general', 'Could not re-encode a picked image, leaving it out', { error });
    return null;
  }
}

/**
 * {@link stripImageMetadata} for a batch, in order. `failed` is how many had to
 * be left out — tell the user when it is not zero.
 */
export async function stripImagesMetadata(
  images: readonly LocalImage[],
  options: StripOptions = {},
): Promise<{ images: LocalImage[]; failed: number }> {
  const cleaned: LocalImage[] = [];
  for (const image of images) {
    const clean = await stripImageMetadata(image, options);
    if (clean) cleaned.push(clean);
  }
  return { images: cleaned, failed: images.length - cleaned.length };
}
