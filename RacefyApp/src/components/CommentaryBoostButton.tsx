import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { spacing } from '../theme';

interface CommentaryBoostButtonProps {
  eventId: number;
  commentaryId: number;
  boostsCount: number;
  userBoosted?: boolean;
  onBoostComplete?: (newBoostsCount: number) => void;
  onBoostChange?: (isBoosted: boolean, newBoostsCount: number) => void;
}

export function CommentaryBoostButton({
  eventId,
  commentaryId,
  boostsCount: initialBoostsCount,
  userBoosted: initialUserBoosted = false,
  onBoostComplete,
  onBoostChange,
}: CommentaryBoostButtonProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [boostsCount, setBoostsCount] = useState(initialBoostsCount);
  const [userBoosted, setUserBoosted] = useState(initialUserBoosted);
  const [loading, setLoading] = useState(false);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handleToggleBoost = async () => {
    if (loading) return;

    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Optimistic UI update
    const previousBoostsCount = boostsCount;
    const previousUserBoosted = userBoosted;
    const newUserBoosted = !userBoosted;
    const newBoostsCount = newUserBoosted
      ? boostsCount + 1
      : Math.max(0, boostsCount - 1);

    setBoostsCount(newBoostsCount);
    setUserBoosted(newUserBoosted);

    // Animate on boost (not unboost)
    if (newUserBoosted) {
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
      setLoading(true);
      logger.debug('commentary', newUserBoosted ? 'Boosting commentary' : 'Unboosting commentary', {
        eventId,
        commentaryId,
      });

      const result = newUserBoosted
        ? await api.boostCommentary(eventId, commentaryId)
        : await api.unboostCommentary(eventId, commentaryId);

      // Update with server response
      setBoostsCount(result.boosts_count);
      setUserBoosted(newUserBoosted);

      logger.info('commentary', `Commentary ${newUserBoosted ? 'boosted' : 'unboosted'} successfully`, {
        boosts_count: result.boosts_count,
      });

      onBoostComplete?.(result.boosts_count);
      onBoostChange?.(newUserBoosted, result.boosts_count);
    } catch (err: any) {
      // Revert optimistic update on error
      setBoostsCount(previousBoostsCount);
      setUserBoosted(previousUserBoosted);

      logger.error('commentary', 'Failed to toggle commentary boost', { error: err });

      Alert.alert(
        t('commentary.error', 'Error'),
        t('commentary.boostFailed', 'Failed to boost commentary. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-15deg'],
  });

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: userBoosted
            ? `${colors.primary}20`
            : colors.cardBackground,
          borderColor: userBoosted ? colors.primary : colors.border,
        },
      ]}
      onPress={handleToggleBoost}
      disabled={loading}
      activeOpacity={0.7}
      accessibilityLabel={
        userBoosted
          ? t('commentary.removeCommentaryBoost', 'Remove commentary boost')
          : t('commentary.boostCommentary', 'Boost commentary')
      }
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Animated.View
          style={{
            transform: [
              { scale: scaleAnim },
              { rotate: rotateInterpolate },
            ],
          }}
        >
          <Ionicons
            name={userBoosted ? 'rocket' : 'rocket-outline'}
            size={18}
            color={userBoosted ? colors.primary : colors.textSecondary}
          />
        </Animated.View>
      )}
      <Text
        style={[
          styles.count,
          {
            color: userBoosted ? colors.primary : colors.textSecondary,
            marginLeft: spacing.xs,
          },
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
    borderWidth: 1,
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
  },
});
