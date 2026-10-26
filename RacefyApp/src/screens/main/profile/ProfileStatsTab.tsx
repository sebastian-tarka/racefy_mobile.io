import React from 'react';

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  CompareUserSelector,
  PersonalBestsCard,
  PointsCard,
  SegmentedControl,
  SportSplitCard,
  SportTypeFilter,
  StatsHeadlineCard,
  StatsTrendCard,
} from '../../../components';
import type { useActivityTrends } from '../../../hooks/useActivityTrends';
import { useSubscription } from '../../../hooks/useSubscription';
import { useTheme } from '../../../hooks/useTheme';
import type { SportTypeWithIcon } from '../../../hooks/useSportTypes';
import { borderRadius, fontSize, spacing } from '../../../theme';
import type { User, UserPointStats } from '../../../types/api';
import type { PeriodOption, TimeRange } from '../../../utils/dateRanges';
import type { ProfileStatsFilters } from './useProfileStatsFilters';
import type { ProfileScreenNavigationProp } from './ProfileHeader';

const TIME_RANGE_OPTIONS: PeriodOption<TimeRange>[] = [
  { value: 'all_time', labelKey: 'profile.stats.timeRange.allTime' },
  { value: 'year', labelKey: 'profile.stats.timeRange.year' },
  { value: 'month', labelKey: 'profile.stats.timeRange.month' },
  { value: 'week', labelKey: 'profile.stats.timeRange.week' },
];

type Trends = ReturnType<typeof useActivityTrends>;

interface Props {
  filters: ProfileStatsFilters;
  sportTypes: SportTypeWithIcon[];
  trends: Trends['trends'];
  trendGranularity: Trends['granularity'];
  isLoadingTrends: boolean;
  following: User[];
  isLoadingFollowing: boolean;
  pointStats: UserPointStats | null;
  isLoadingPointStats: boolean;
  navigation: ProfileScreenNavigationProp;
}

/**
 * The Stats tab: period and sport for everything below, then the headline,
 * trend, sport split, personal bests, points, and — for Plus/Pro — comparing
 * against an athlete you follow.
 */
export function ProfileStatsTab({
  filters: f,
  sportTypes,
  trends,
  trendGranularity,
  isLoadingTrends,
  following,
  isLoadingFollowing,
  pointStats,
  isLoadingPointStats,
  navigation,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { canUse } = useSubscription();

  return (
    <View style={styles.statsTabContent}>
      {/* Period and sport apply to everything below; the metric switch
          lives on the card it changes. */}
      <SegmentedControl
        options={TIME_RANGE_OPTIONS.map((option) => ({
          value: option.value,
          label: t(option.labelKey),
        }))}
        value={f.selectedTimeRange}
        onChange={f.setSelectedTimeRange}
      />
      <View style={styles.filterBleed}>
        <SportTypeFilter
          sportTypes={sportTypes}
          selectedSportTypeId={f.selectedSportTypeId}
          onSelectSportType={f.setSelectedSportTypeId}
          isLoading={f.isLoadingActivityStats}
        />
      </View>

      <StatsHeadlineCard
        stats={f.activityStats}
        previous={f.previousStats}
        metric={f.statsMetric}
        onMetricChange={f.setStatsMetric}
        periodLabel={t(
          TIME_RANGE_OPTIONS.find((o) => o.value === f.selectedTimeRange)?.labelKey ?? '',
        )}
        comparesToPrevious={f.previousRange != null}
      />

      <StatsTrendCard
        trends={trends}
        granularity={trendGranularity}
        metric={f.statsMetric}
        isLoading={isLoadingTrends}
      />

      <SportSplitCard
        stats={f.activityStats}
        sportTypes={sportTypes}
        metric={f.statsMetric}
        selectedSportTypeId={f.selectedSportTypeId}
        compareStats={f.compareStats}
        compareUserName={f.compareUser?.name}
      />

      <PersonalBestsCard
        stats={f.activityStats}
        onOpenActivity={(activityId) => navigation.navigate('ActivityDetail', { activityId })}
      />

      <PointsCard
        stats={pointStats}
        isLoading={isLoadingPointStats}
        onViewHistory={() => navigation.navigate('PointHistory')}
        onViewLeaderboard={() => navigation.navigate('Leaderboard')}
      />

      {/* Comparing against another athlete is the paid part. It used to be a
          full locked card at the top of the tab, before anyone had seen a
          single number of their own; now it closes the tab as one row. */}
      {canUse('advanced_stats') ? (
        <CompareUserSelector
          following={following}
          selectedUser={f.compareUser}
          onSelectUser={f.setCompareUser}
          isLoading={isLoadingFollowing || f.isLoadingCompareStats}
        />
      ) : (
        <TouchableOpacity
          style={[
            styles.advancedRow,
            { backgroundColor: colors.aiLight, borderColor: colors.ai + '33' },
          ]}
          onPress={() => navigation.navigate('Paywall', { feature: 'advanced_stats' })}
          activeOpacity={0.8}
        >
          <View style={[styles.advancedIcon, { backgroundColor: colors.ai }]}>
            <Ionicons name="lock-closed" size={15} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.advancedTitle, { color: colors.textPrimary }]}>
              {t('profile.stats.advanced.title')}
            </Text>
            <Text style={[styles.advancedBody, { color: colors.ai }]} numberOfLines={2}>
              {t('profile.stats.advanced.body')}
            </Text>
          </View>
          <View style={[styles.advancedBadge, { backgroundColor: colors.ai }]}>
            <Text style={styles.advancedBadgeText}>{t('profile.stats.advanced.cta')}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  advancedBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  advancedBadgeText: {
    color: '#ffffff',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  advancedBody: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  advancedIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  advancedTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  filterBleed: {
    marginHorizontal: -spacing.lg,
  },
  statsTabContent: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
});
