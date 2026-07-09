import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';

/** Tunables for the fade-in / hold / fade-out cycle (milliseconds). */
export interface FadeToastOptions {
  /** Fade-in and fade-out duration. Default 200. */
  fadeDuration?: number;
  /** How long the toast stays fully visible between fades. Default 1800. */
  holdDuration?: number;
}

export interface FadeToast<T> {
  /** Whether the toast is currently mounted/visible. */
  visible: boolean;
  /** Driving opacity value to bind to the toast's style. */
  opacity: Animated.Value;
  /** The payload passed to the most recent show() (undefined before first show). */
  payload: T | undefined;
  /** Show the toast with a payload, running the fade-in → hold → fade-out cycle. */
  show: (payload: T) => void;
}

/**
 * A self-dismissing fade toast: fade in, hold, fade out, then unmount. Extracted
 * from ActivityRecordingScreen, which had this exact imperative Animated.sequence
 * duplicated for the lock and audio-coach toasts. The payload lets the caller
 * carry per-show state (e.g. the on/off flag that styles the toast).
 */
export function useFadeToast<T = void>(options: FadeToastOptions = {}): FadeToast<T> {
  const { fadeDuration = 200, holdDuration = 1800 } = options;
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<T | undefined>(undefined);
  const opacity = useRef(new Animated.Value(0)).current;

  const show = useCallback(
    (value: T) => {
      setPayload(value);
      setVisible(true);
      opacity.setValue(0);
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: fadeDuration, useNativeDriver: true }),
        Animated.delay(holdDuration),
        Animated.timing(opacity, { toValue: 0, duration: fadeDuration, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    },
    [opacity, fadeDuration, holdDuration],
  );

  return { visible, opacity, payload, show };
}
