import React, { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  decimals?: number;
  style?: TextStyle;
  duration?: number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  suffix = '',
  decimals = 0,
  style,
  duration = 1200,
}) => {
  const [displayValue, setDisplayValue] = useState('0');
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration, animatedValue]);

  // Update display value as animation progresses
  useAnimatedReaction(
    () => animatedValue.value,
    (currentValue) => {
      const formattedValue = decimals > 0
        ? currentValue.toFixed(decimals)
        : Math.round(currentValue).toString();

      runOnJS(setDisplayValue)(`${formattedValue}${suffix}`);
    }
  );

  return <Text style={style}>{displayValue}</Text>;
};
