import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { logger } from '../services/logger';
import { triggerHaptic } from './useHaptics';

export type MapStyleType = 'outdoors' | 'streets' | 'satellite';

/** Cycle order for the map style toggle. */
const MAP_STYLES: MapStyleType[] = ['outdoors', 'streets', 'satellite'];

/** The next style in the cycle (wraps around). Pure. */
export function nextMapStyle(current: MapStyleType): MapStyleType {
  const index = MAP_STYLES.indexOf(current);
  return MAP_STYLES[(index + 1) % MAP_STYLES.length];
}

export interface MapStyleCycler {
  /** The current map style. */
  mapStyle: MapStyleType;
  /** Advance to the next style (with haptic + log), e.g. on the toggle button. */
  cycle: () => void;
  /** Whether the "style changed" toast is currently shown. */
  toastVisible: boolean;
  /** Opacity to bind to the toast view. */
  toastOpacity: Animated.Value;
}

/**
 * Owns the recording map's style selection + the self-hiding "style changed" toast
 * that appears whenever the style changes (or the map view is entered). Extracted
 * from ActivityRecordingScreen. The toast is effect-driven (shows on map view,
 * auto-hides after 2s) — distinct from the imperative useFadeToast, so kept separate.
 */
export function useMapStyleCycler(viewMode: 'stats' | 'map'): MapStyleCycler {
  const [mapStyle, setMapStyle] = useState<MapStyleType>('outdoors');
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Show the toast when the style changes (or the map view becomes active).
  useEffect(() => {
    if (viewMode === 'map') {
      setToastVisible(true);

      // Fade in
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Auto-hide after 2 seconds
      const timer = setTimeout(() => {
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setToastVisible(false);
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [mapStyle, viewMode, toastOpacity]);

  const cycle = useCallback(() => {
    setMapStyle((prev) => {
      const next = nextMapStyle(prev);
      logger.info('activity', 'Map style changed', { from: prev, to: next });
      return next;
    });
    triggerHaptic();
  }, []);

  return { mapStyle, cycle, toastVisible, toastOpacity };
}
