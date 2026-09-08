import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface Props {
  color: string;
  size?: number;
  /** Freeze the ring — used when the recording is paused. */
  paused?: boolean;
}

/**
 * The live dot (design: RXLivePulse) — a solid dot with a ring that expands and
 * fades out of it. Used next to "RECORDING" / "GPS ready" so the state reads as
 * live at a glance rather than as a static badge.
 */
export function LivePulse({ color, size = 8, paused = false }: Props) {
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (paused) {
      ring.stopAnimation();
      ring.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [paused, ring]);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
          },
        ]}
      />
      <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
