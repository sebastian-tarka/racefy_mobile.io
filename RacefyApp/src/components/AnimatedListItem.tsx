import React, { useEffect, useState } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedListItemProps {
  index: number;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Delay between each item in ms (default: 60) */
  staggerDelay?: number;
  /** Animation duration in ms (default: 400) */
  duration?: number;
  /**
   * Stable id of the item (e.g. `feed:${post.id}`). A virtualized list unmounts rows that
   * scroll out of its window and mounts them again on the way back; with a key the entrance
   * plays only the first time, instead of the row fading in again — after up to 600 ms of
   * stagger delay, blank — every time it is scrolled back into view.
   */
  animateKey?: string;
}

/** Keys whose entrance already played (lives for the app session; one short string per row). */
const animatedKeys = new Set<string>();

export function AnimatedListItem({
  index,
  children,
  style,
  staggerDelay = 60,
  duration = 400,
  animateKey,
}: AnimatedListItemProps) {
  // Decided once per mount: already-seen rows start in their final state.
  const [alreadyShown] = useState(() => !!animateKey && animatedKeys.has(animateKey));
  const opacity = useSharedValue(alreadyShown ? 1 : 0);
  const translateY = useSharedValue(alreadyShown ? 0 : 12);

  // Cap stagger to first 10 items to avoid long delays on big lists
  const delay = Math.min(index, 10) * staggerDelay;

  useEffect(() => {
    if (alreadyShown) return;
    if (animateKey) animatedKeys.add(animateKey);
    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: Easing.out(Easing.ease),
      }),
    );

    translateY.value = withDelay(
      delay,
      withTiming(0, {
        duration,
        easing: Easing.out(Easing.ease),
      }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
