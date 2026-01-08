import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize } from '../theme';

interface ProfileStatsProps {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  onFollowersPress: () => void;
  onFollowingPress: () => void;
}

export function ProfileStats({
  postsCount,
  followersCount,
  followingCount,
  onFollowersPress,
  onFollowingPress,
}: ProfileStatsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{postsCount}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          {t('profile.stats.posts')}
        </Text>
      </View>
      <TouchableOpacity style={styles.statItem} onPress={onFollowersPress}>
        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{followersCount}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          {t('profile.stats.followers')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.statItem} onPress={onFollowingPress}>
        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{followingCount}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          {t('profile.stats.following')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    gap: spacing.xxxl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
});