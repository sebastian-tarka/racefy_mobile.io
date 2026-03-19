import React, { useEffect } from 'react';
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
}

export function AnimatedListItem({
  index,
  children,
  style,
  staggerDelay = 60,
  duration = 400,
}: AnimatedListItemProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  // Cap stagger to first 10 items to avoid long delays on big lists
  const delay = Math.min(index, 10) * staggerDelay;

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: Easing.out(Easing.ease),
      })
    );

    translateY.value = withDelay(
      delay,
      withTiming(0, {
        duration,
        easing: Easing.out(Easing.ease),
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
