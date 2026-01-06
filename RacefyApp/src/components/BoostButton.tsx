import React, { useState, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { api } from '../services/api';
import { spacing, fontSize } from '../theme';

// Boost button colors
const BOOST_COLOR_ACTIVE = '#FF6B35'; // Vibrant orange for boosted state
const BOOST_COLOR_INACTIVE = '#666666'; // Gray for inactive state

interface BoostButtonProps {
  activityId: number;
  initialBoostsCount: number;
  initialIsBoosted: boolean;
  /** Disable button (e.g., for own activities) */
  disabled?: boolean;
  /** Compact mode - smaller size for cards */
  compact?: boolean;
  /** Callback when boost state changes */
  onBoostChange?: (isBoosted: boolean, boostsCount: number) => void;
}

export function BoostButton({
  activityId,
  initialBoostsCount,
  initialIsBoosted,
  disabled = false,
  compact = false,
  onBoostChange,
}: BoostButtonProps) {
  const { colors } = useTheme();
  const [boostsCount, setBoostsCount] = useState(initialBoostsCount);
  const [isBoosted, setIsBoosted] = useState(initialIsBoosted);
  const [isLoading, setIsLoading] = useState(false);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handleBoost = async () => {
    if (disabled || isLoading) return;

    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Optimistic update
    const previousIsBoosted = isBoosted;
    const previousBoostsCount = boostsCount;
    const newIsBoosted = !isBoosted;
    const newBoostsCount = newIsBoosted ? boostsCount + 1 : boostsCount - 1;

    setIsBoosted(newIsBoosted);
    setBoostsCount(newBoostsCount);

    // Animate on boost (not unboost)
    if (newIsBoosted) {
      // Scale + rotation animation for "rocket launch" effect
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.4,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }

    try {
      setIsLoading(true);

      const response = newIsBoosted
        ? await api.boostActivity(activityId)
        : await api.unboostActivity(activityId);

      // Update with server response (source of truth)
      setBoostsCount(response.boosts_count);
      onBoostChange?.(newIsBoosted, response.boosts_count);
    } catch (error: any) {
      // Rollback on error
      setIsBoosted(previousIsBoosted);
      setBoostsCount(previousBoostsCount);
      console.error('Boost error:', error?.message || error);
    } finally {
      setIsLoading(false);
    }
  };

  const iconSize = compact ? 18 : 22;
  const textSize = compact ? fontSize.sm : fontSize.md;
  const activeColor = isBoosted ? BOOST_COLOR_ACTIVE : colors.textMuted;

  // Rotation interpolation for the "launch" effect
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-15deg'],
  });

  return (
    <TouchableOpacity
      onPress={handleBoost}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      style={[
        styles.container,
        compact && styles.containerCompact,
        disabled && styles.disabled,
      ]}
      accessibilityLabel={isBoosted ? 'Remove boost' : 'Boost activity'}
      accessibilityHint={
        disabled
          ? "You can't boost your own activity"
          : `${boostsCount} boosts. Tap to ${isBoosted ? 'remove' : 'add'} boost.`
      }
      accessibilityRole="button"
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={activeColor} />
      ) : (
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [
                { scale: scaleAnim },
                { rotate: rotateInterpolate },
              ],
            },
          ]}
        >
          <Ionicons
            name={isBoosted ? 'rocket' : 'rocket-outline'}
            size={iconSize}
            color={activeColor}
          />
        </Animated.View>
      )}
      <Text
        style={[
          styles.count,
          { color: activeColor, fontSize: textSize },
          compact && styles.countCompact,
        ]}
      >
        {boostsCount}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  containerCompact: {
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  count: {
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  countCompact: {
    marginLeft: 4,
  },
  disabled: {
    opacity: 0.5,
  },
});
