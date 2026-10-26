import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { EmptyState, RewardCard } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { api } from '../../../services/api';
import { logger } from '../../../services/logger';
import { borderRadius, fontSize, spacing } from '../../../theme';
import type { Reward } from '../../../types/api';

type RewardFilterOption = 'all' | 'points' | 'coupon' | 'badge' | 'prize';

interface Props {
  isAuthenticated: boolean;
  bottomPadding: number;
  onOpenEvent: (eventId: number) => void;
}

/**
 * The Rewards tab of the Events screen: totals, type filter and the list of
 * won rewards. Self-contained — it shares nothing with the events tab but the
 * header above it.
 */
export function EventsRewardsTab({ isAuthenticated, bottomPadding, onOpenEvent }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsRefreshing, setRewardsRefreshing] = useState(false);
  const [rewardFilter, setRewardFilter] = useState<RewardFilterOption>('all');
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalCoupons, setTotalCoupons] = useState(0);
  const [totalBadges, setTotalBadges] = useState(0);
  const [rewardsError, setRewardsError] = useState<string | null>(null);

  // Load rewards from API
  const loadRewards = useCallback(
    async (isRefreshing = false) => {
      if (!isAuthenticated) return;

      if (isRefreshing) {
        setRewardsRefreshing(true);
      } else {
        setRewardsLoading(true);
      }

      setRewardsError(null);

      try {
        const filters = rewardFilter !== 'all' ? { type: rewardFilter } : undefined;
        logger.info('api', 'Loading rewards', { filters, rewardFilter });

        const response = await api.getUserRewards(filters);

        logger.info('api', 'Rewards loaded', {
          count: response.data.length,
          total_points: response.total_points,
          filter: rewardFilter,
          types: response.data.map((r) => r.reward_type),
        });

        setRewards(response.data);
        setTotalPoints(response.total_points);
        setTotalCoupons(response.total_coupons);
        setTotalBadges(response.total_badges);
      } catch (error) {
        logger.error('api', 'Failed to load rewards', { error });
        setRewardsError('Failed to load rewards');
      } finally {
        setRewardsLoading(false);
        setRewardsRefreshing(false);
      }
    },
    [isAuthenticated, rewardFilter],
  );

  // Mounted only while the Rewards tab is open: load on entry and on a filter change.
  useEffect(() => {
    loadRewards();
  }, [rewardFilter, loadRewards]);

  if (rewardsLoading && rewards.length === 0) {
    return (
      <View style={styles.inlineLoading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const rewardFilters: { label: string; value: RewardFilterOption }[] = [
    { label: t('rewards.filters.all'), value: 'all' },
    { label: t('rewards.filters.points'), value: 'points' },
    { label: t('rewards.filters.coupons'), value: 'coupon' },
    { label: t('rewards.filters.badges'), value: 'badge' },
    { label: t('rewards.filters.prizes'), value: 'prize' },
  ];

  // Calculate filtered stats
  const filteredPointsSum = rewards
    .filter((r) => r.reward_type === 'points')
    .reduce((sum, r) => sum + (r as any).points, 0);

  const filteredCouponsCount = rewards.filter((r) => r.reward_type === 'coupon').length;
  const filteredBadgesCount = rewards.filter((r) => r.reward_type === 'badge').length;

  // Show filtered or total stats
  const displayPoints = rewardFilter === 'points' ? filteredPointsSum : totalPoints;
  const displayCoupons = rewardFilter === 'coupon' ? filteredCouponsCount : totalCoupons;
  const displayBadges = rewardFilter === 'badge' ? filteredBadgesCount : totalBadges;

  return (
    <>
      {/* Stats Summary - Only show when filter is 'all' */}
      {rewardFilter === 'all' && (
        <View style={[styles.statsContainer, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={20} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{displayPoints}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('rewards.stats.totalPoints')}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="ticket" size={20} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{displayCoupons}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('rewards.stats.totalCoupons')}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="medal" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{displayBadges}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('rewards.stats.totalBadges')}
            </Text>
          </View>
        </View>
      )}

      {/* Reward Filters */}
      <View
        style={[
          styles.filterContainer,
          { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
        ]}
      >
        {rewardFilters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterButton,
              { backgroundColor: colors.borderLight },
              rewardFilter === filter.value && { backgroundColor: colors.primary },
            ]}
            onPress={() => setRewardFilter(filter.value)}
          >
            <Text
              style={[
                styles.filterText,
                { color: colors.textSecondary },
                rewardFilter === filter.value && { color: colors.white },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results count */}
      {!rewardsLoading && rewards.length > 0 && (
        <View style={styles.resultsCount}>
          <Text style={[styles.resultsCountText, { color: colors.textMuted }]}>
            {rewards.length} {rewards.length === 1 ? t('rewards.reward') : t('rewards.rewards')}
            {rewardFilter !== 'all' && ` • ${t('rewards.stats.totalPoints')}: ${totalPoints}`}
          </Text>
        </View>
      )}

      {/* Rewards List */}
      <FlatList
        data={rewards}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <RewardCard
            reward={item}
            onPress={() => {
              if ('event_id' in item && item.event_id) {
                onOpenEvent(item.event_id);
              }
            }}
          />
        )}
        ListEmptyComponent={
          rewardsError ? (
            <EmptyState
              icon="alert-circle-outline"
              title={t('rewards.failedToLoad')}
              message={rewardsError}
              actionLabel={t('common.tryAgain')}
              onAction={() => loadRewards()}
            />
          ) : (
            <EmptyState
              icon="gift-outline"
              title={t('rewards.noRewards')}
              message={t('rewards.noRewardsMessage')}
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={rewardsRefreshing}
            onRefresh={() => loadRewards(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    // Design "Racefy v2" (EventsScreen): the selected filter is the one solid
    // dark chip; the rest are outlines. Emerald is the brand accent and reads
    // as "go" — spending it on a list filter left nothing for the actions.
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  inlineLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  resultsCount: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  resultsCountText: {
    fontSize: fontSize.sm,
  },
  statItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
});
