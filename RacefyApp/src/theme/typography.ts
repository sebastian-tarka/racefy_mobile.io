import { Platform } from 'react-native';

/**
 * Font families. Kept out of ./spacing so that file stays free of Platform
 * (its scale tests mock react-native down to Dimensions + PixelRatio).
 */
export const fontFamily = {
  /** Tabular figures for set chips ("55×8") and big numbers. */
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};
