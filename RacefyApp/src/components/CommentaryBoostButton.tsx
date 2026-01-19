import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { spacing } from '../theme';

interface CommentaryBoostButtonProps {
  eventId: number;
  commentaryId: number;
  boostsCount: number;
  userBoosted?: boolean;
  onBoostComplete?: (newBoostsCount: number) => void;
}

export function CommentaryBoostButton({
  eventId,
  commentaryId,
  boostsCount: initialBoostsCount,
  userBoosted: initialUserBoosted = false,
  onBoostComplete,
}: CommentaryBoostButtonProps) {
  const { colors } = useTheme();
  const [boostsCount, setBoostsCount] = useState(initialBoostsCount);
  const [userBoosted, setUserBoosted] = useState(initialUserBoosted);
  const [loading, setLoading] = useState(false);

  const handleBoost = async () => {
    if (loading) return;

    // Optimistic UI update
    const previousBoostsCount = boostsCount;
    const previousUserBoosted = userBoosted;

    setBoostsCount((prev) => prev + 1);
    setUserBoosted(true);

    try {
      setLoading(true);
      logger.debug('commentary', 'Boosting commentary', {
        eventId,
        commentaryId,
      });

      const result = await api.boostCommentary(eventId, commentaryId);

      // Update with server response
      setBoostsCount(result.boosts_count);
      setUserBoosted(true);

      logger.info('commentary', 'Commentary boosted successfully', {
        boosts_count: result.boosts_count,
      });

      onBoostComplete?.(result.boosts_count);
    } catch (err: any) {
      // Revert optimistic update on error
      setBoostsCount(previousBoostsCount);
      setUserBoosted(previousUserBoosted);

      logger.error('commentary', 'Failed to boost commentary', { error: err });

      // Show error to user
      const errorMessage =
        err.message === 'You have already boosted this commentary'
          ? 'You have already boosted this commentary'
          : 'Failed to boost commentary. Please try again.';

      Alert.alert('Boost Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
      onPress={handleBoost}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons
          name={userBoosted ? 'rocket' : 'rocket-outline'}
          size={18}
          color={userBoosted ? colors.primary : colors.textSecondary}
        />
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