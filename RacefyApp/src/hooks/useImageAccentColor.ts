import {useEffect, useState} from 'react';
import ImageColors from 'react-native-image-colors';

/**
 * Extracts an accent color from an image URL.
 * Returns the dominant/vibrant color, or the provided fallback.
 */
export function useImageAccentColor(imageUrl: string | null | undefined, fallback: string): string {
  const [color, setColor] = useState(fallback);

  useEffect(() => {
    if (!imageUrl) {
      setColor(fallback);
      return;
    }

    let cancelled = false;

    ImageColors.getColors(imageUrl, {
      fallback,
      cache: true,
      key: imageUrl,
    }).then((result) => {
      if (cancelled) return;

      let extracted: string | undefined;

      if (result.platform === 'android') {
        extracted = result.vibrant ?? result.dominant ?? result.darkVibrant;
      } else if (result.platform === 'ios') {
        extracted = result.primary ?? result.secondary ?? result.detail;
      } else if (result.platform === 'web') {
        extracted = result.dominant ?? result.vibrant;
      }

      setColor(extracted || fallback);
    }).catch(() => {
      if (!cancelled) setColor(fallback);
    });

    return () => { cancelled = true; };
  }, [imageUrl, fallback]);

  return color;
}