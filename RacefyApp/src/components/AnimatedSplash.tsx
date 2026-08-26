import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { fontSize } from '../theme';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// Brand color — must match `splash.backgroundColor` in app.config.ts and the
// native splashscreen_background so the native→JS handoff is seamless.
const BRAND_GREEN = '#10b981';

interface AnimatedSplashProps {
  /** Called once the exit animation has finished so the host can unmount this overlay. */
  onFinish: () => void;
}

/**
 * Animated splash overlay that takes over from the static native splash screen.
 *
 * Sequence: logo springs in (with a subtle pulse) + the "Racefy" wordmark fades
 * up beneath it, briefly holds, then the whole overlay fades out and zooms
 * slightly to reveal the app underneath.
 */
export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const containerOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkTranslate = useSharedValue(12);

  useEffect(() => {
    // Hand off from the native splash now that our identical-looking overlay is mounted.
    SplashScreen.hideAsync().catch(() => {});

    logoOpacity.value = withTiming(1, { duration: 400 });
    logoScale.value = withSequence(
      withSpring(1, { damping: 9, stiffness: 130, mass: 0.8 }),
      withDelay(120, withRepeat(withTiming(1.05, { duration: 600 }), 2, true)),
    );

    wordmarkOpacity.value = withDelay(350, withTiming(1, { duration: 450 }));
    wordmarkTranslate.value = withDelay(
      350,
      withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }),
    );

    const exitTimer = setTimeout(() => {
      logoScale.value = withTiming(1.12, {
        duration: 480,
        easing: Easing.in(Easing.cubic),
      });
      containerOpacity.value = withTiming(
        0,
        { duration: 480, easing: Easing.in(Easing.quad) },
        (finished) => {
          if (finished) {
            runOnJS(onFinish)();
          }
        },
      );
    }, 1700);

    return () => clearTimeout(exitTimer);
    // Shared values are stable; run this setup exactly once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkTranslate.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, containerStyle]}>
      <Animated.Image
        source={require('../../assets/splash-logo.png')}
        style={[styles.logo, logoStyle]}
        resizeMode="contain"
      />
      <Animated.Text style={[styles.wordmark, wordmarkStyle]}>Racefy</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 140,
    height: 140,
  },
  wordmark: {
    marginTop: 20,
    color: '#ffffff',
    fontSize: fontSize.title,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
