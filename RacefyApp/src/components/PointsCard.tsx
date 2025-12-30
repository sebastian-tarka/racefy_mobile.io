import React, { memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { UserPointStats } from '../types/api';

interface PointsCardProps {
  stats: UserPointStats | null;
  isLoading: boolean;
}

function PointsCardComponent({ stats, isLoading }: PointsCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="trophy-outline" size={32} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t('profile.points.noPoints')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Total Points */}
      <View style={styles.totalSection}>
        <Ionicons name="trophy" size={28} color={colors.primary} />
        <Text style={[styles.totalPoints, { color: colors.textPrimary }]}>
          {stats.total_points.toLocaleString()}
        </Text>
        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
          {t('profile.points.totalPoints')}
        </Text>
        <View style={[styles.rankBadge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.rankText, { color: colors.primary }]}>
            {t('profile.points.globalRank')} #{stats.global_rank}
          </Text>
        </View>
      </View>

      {/* Weekly & Monthly */}
      <View style={styles.periodSection}>
        <View style={styles.periodItem}>
          <Text style={[styles.periodValue, { color: colors.textPrimary }]}>
            {stats.weekly_points.toLocaleString()}
          </Text>
          <Text style={[styles.periodLabel, { color: colors.textSecondary }]}>
            {t('profile.points.weeklyPoints')}
          </Text>
          <Text style={[styles.periodRank, { color: colors.textMuted }]}>
            #{stats.weekly_rank}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.periodItem}>
          <Text style={[styles.periodValue, { color: colors.textPrimary }]}>
            {stats.monthly_points.toLocaleString()}
          </Text>
          <Text style={[styles.periodLabel, { color: colors.textSecondary }]}>
            {t('profile.points.monthlyPoints')}
          </Text>
          <Text style={[styles.periodRank, { color: colors.textMuted }]}>
            #{stats.monthly_rank}
          </Text>
        </View>
      </View>

      {/* Breakdown */}
      <View style={[styles.breakdownSection, { borderTopColor: colors.border }]}>
        <View style={styles.breakdownItem}>
          <Ionicons name="fitness-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
            {t('profile.points.fromActivities')}
          </Text>
          <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
            {stats.activity_points.toLocaleString()}
          </Text>
        </View>
        <View style={styles.breakdownItem}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
            {t('profile.points.fromEvents')}
          </Text>
          <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
            {stats.event_points.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  totalSection: {
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  totalPoints: {
    fontSize: fontSize.xxxl || 32,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  totalLabel: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  rankBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  rankText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  periodSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  periodItem: {
    flex: 1,
    alignItems: 'center',
  },
  periodValue: {
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  periodLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  periodRank: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
  },
  breakdownSection: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  breakdownValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

// Memoize to prevent re-renders when parent state changes
export const PointsCard = memo(PointsCardComponent);
