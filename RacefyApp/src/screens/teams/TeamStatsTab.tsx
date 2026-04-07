import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, useSportTypes, useUnits } from '../../hooks';
import { useTeamStats } from '../../hooks/useTeamStats';
import { useTeamRanking } from '../../hooks/useTeamRanking';
import { useTeamTrends } from '../../hooks/useTeamTrends';
import { Card, Avatar, OptionSelector, EmptyState } from '../../components';
import { spacing, fontSize, borderRadius } from '../../theme';
import { formatTime, formatTotalTime } from '../../utils/formatters';
import type { StatsPeriod, RankingSortBy, TrendGranularity } from '../../types/api';

interface TeamStatsTabProps {
  slug: string;
  onUserPress: (username: string) => void;
}

const PERIOD_OPTIONS: { value: StatsPeriod; labelKey: string }[] = [
  { value: 'this_week', labelKey: 'teams.periodThisWeek' },
  { value: 'last_week', labelKey: 'teams.periodLastWeek' },
  { value: 'this_month', labelKey: 'teams.periodThisMonth' },
  { value: 'last_month', labelKey: 'teams.periodLastMonth' },
  { value: 'this_year', labelKey: 'teams.periodThisYear' },
  { value: 'last_year', labelKey: 'teams.periodLastYear' },
];

const RANKING_SORT_OPTIONS: { value: RankingSortBy; labelKey: string }[] = [
  { value: 'distance', labelKey: 'teams.sortDistance' },
  { value: 'duration', labelKey: 'teams.sortDuration' },
  { value: 'elevation', labelKey: 'teams.sortElevation' },
  { value: 'activities', labelKey: 'teams.sortActivities' },
];

export function TeamStatsTab({ slug, onUserPress }: TeamStatsTabProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistance } = useUnits();
  const { getSportById } = useSportTypes();

  const [period, setPeriod] = useState<StatsPeriod>('this_month');
  const [rankingSortBy, setRankingSortBy] = useState<RankingSortBy>('distance');
  const [granularity, setGranularity] = useState<TrendGranularity>('weekly');

  const { stats, isLoading: statsLoading, error: statsError } = useTeamStats(slug, period);
  const { ranking, isLoading: rankingLoading } = useTeamRanking(slug, rankingSortBy, period);
  const { trends, isLoading: trendsLoading } = useTeamTrends(slug, granularity);

  const periodOptions = useMemo(() =>
    PERIOD_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );

  const rankingSortOptions = useMemo(() =>
    RANKING_SORT_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );

  const formatDist = useCallback((meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} km`;
    return `${meters} m`;
  }, []);

  const formatCalories = useCallback((cal: number) => {
    if (cal >= 1000) return `${(cal / 1000).toFixed(1)}k`;
    return String(cal);
  }, []);

  const getRankStyle = useCallback((rank: number) => {
    if (rank === 1) return { color: '#f59e0b', icon: 'trophy' as const };
    if (rank === 2) return { color: '#9ca3af', icon: 'medal' as const };
    if (rank === 3) return { color: '#b45309', icon: 'medal-outline' as const };
    return { color: colors.textMuted, icon: null };
  }, [colors]);

  const getRankingValue = useCallback((member: any) => {
    switch (rankingSortBy) {
      case 'distance': return formatDist(member.total_distance);
      case 'duration': return formatTotalTime(member.total_duration);
      case 'elevation': return `${member.total_elevation.toLocaleString()} m`;
      case 'activities': return `${member.activities_count}`;
      default: return formatDist(member.total_distance);
    }
  }, [rankingSortBy, formatDist]);

  // 403 = private team
  if (statsError === 'private') {
    return (
      <EmptyState
        icon="lock-closed-outline"
        title={t('teams.statsPrivate')}
        message={t('teams.statsPrivateDescription')}
      />
    );
  }

  if (statsLoading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (statsError) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title={t('common.error')}
        message={statsError}
      />
    );
  }

  if (!stats) return null;

  const periodData = stats.period;
  const allTimeData = stats.all_time;

  // Trends chart: simple bar visualization
  const trendData = trends?.trends || [];
  const maxTrendDistance = Math.max(...trendData.map(d => d.total_distance), 1);

  return (
    <View>
      {/* Period Selector */}
      <OptionSelector
        value={period}
        onChange={setPeriod}
        options={periodOptions}
        showLabel={false}
        containerStyle={styles.periodSelector}
      />

      {/* Summary Cards */}
      <Card style={styles.section}>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{periodData.activities_count}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('teams.activities')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatDist(periodData.total_distance)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('teams.distance')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatTotalTime(periodData.total_duration)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('teams.duration')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{periodData.total_elevation.toLocaleString()} m</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('teams.elevation')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {periodData.active_members}/{stats.members_count}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('teams.activeMembers')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatCalories(periodData.total_calories)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('teams.calories')}</Text>
          </View>
        </View>
      </Card>

      {/* All Time Summary */}
      <Card style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{t('teams.allTime')}</Text>
        <Text style={[styles.allTimeSummary, { color: colors.textSecondary }]}>
          {allTimeData.activities_count} {t('teams.activities').toLowerCase()} {' \u2022 '}
          {formatDist(allTimeData.total_distance)} {' \u2022 '}
          {formatTotalTime(allTimeData.total_duration)}
        </Text>
      </Card>

      {/* Member Ranking */}
      <Card style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('teams.memberRanking')}</Text>
        </View>
        <OptionSelector
          value={rankingSortBy}
          onChange={setRankingSortBy}
          options={rankingSortOptions}
          showLabel={false}
          containerStyle={{ marginBottom: spacing.sm }}
        />
        {rankingLoading && !ranking ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.md }} />
        ) : ranking?.ranking.map((member) => {
          const rankStyle = getRankStyle(member.rank);
          return (
            <TouchableOpacity
              key={`rank-${member.user.id}`}
              style={[styles.rankRow, { borderBottomColor: colors.border }]}
              onPress={() => onUserPress(member.user.username)}
              activeOpacity={0.7}
            >
              <View style={styles.rankNumber}>
                {member.rank <= 3 ? (
                  <Text style={[styles.rankMedal, { color: rankStyle.color }]}>
                    {member.rank === 1 ? '\uD83E\uDD47' : member.rank === 2 ? '\uD83E\uDD48' : '\uD83E\uDD49'}
                  </Text>
                ) : (
                  <Text style={[styles.rankText, { color: colors.textMuted }]}>#{member.rank}</Text>
                )}
              </View>
              <Avatar uri={member.user.avatar} name={member.user.name} size="sm" />
              <View style={styles.rankInfo}>
                <Text style={[styles.rankName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {member.user.name}
                </Text>
              </View>
              <View style={styles.rankStats}>
                <Text style={[styles.rankValue, { color: colors.textPrimary }]}>
                  {getRankingValue(member)}
                </Text>
                <Text style={[styles.rankSub, { color: colors.textMuted }]}>
                  {member.activities_count} act.
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </Card>

      {/* Activity Trends */}
      <Card style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('teams.activityTrends')}</Text>
        </View>
        <OptionSelector
          value={granularity}
          onChange={setGranularity}
          options={[
            { value: 'weekly' as TrendGranularity, label: t('teams.weekly') },
            { value: 'monthly' as TrendGranularity, label: t('teams.monthly') },
          ]}
          showLabel={false}
          containerStyle={{ marginBottom: spacing.sm }}
        />
        {trendsLoading && !trends ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.md }} />
        ) : trendData.length > 0 ? (
          <View style={styles.chartContainer}>
            <View style={styles.barsRow}>
              {trendData.map((point, index) => {
                const height = maxTrendDistance > 0
                  ? Math.max((point.total_distance / maxTrendDistance) * 100, 4)
                  : 4;
                return (
                  <View key={`trend-${index}`} style={styles.barWrapper}>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${height}%`,
                            backgroundColor: point.total_distance > 0 ? colors.primary : colors.border,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.textMuted }]} numberOfLines={1}>
                      {formatTrendLabel(point.period, granularity)}
                    </Text>
                    <Text style={[styles.barValue, { color: colors.textSecondary }]} numberOfLines={1}>
                      {point.total_distance >= 1000
                        ? `${(point.total_distance / 1000).toFixed(0)}`
                        : '0'}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={[styles.chartUnit, { color: colors.textMuted }]}>km</Text>
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('teams.noActivities')}</Text>
        )}
      </Card>

      {/* Sport Type Breakdown */}
      {periodData.by_sport_type && periodData.by_sport_type.length > 0 && (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('teams.bySportType')}</Text>
          {periodData.by_sport_type.map((sportStat) => {
            const sport = getSportById(sportStat.sport_type_id);
            return (
              <View key={`sport-${sportStat.sport_type_id}`} style={[styles.sportRow, { borderBottomColor: colors.border }]}>
                <Ionicons
                  name={(sport?.icon as any) || 'fitness-outline'}
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.sportName, { color: colors.textPrimary }]}>
                  {sport?.name || `Sport #${sportStat.sport_type_id}`}
                </Text>
                <Text style={[styles.sportStat, { color: colors.textSecondary }]}>
                  {sportStat.activities_count} act.
                </Text>
                <Text style={[styles.sportStat, { color: colors.textSecondary }]}>
                  {formatDist(sportStat.total_distance)}
                </Text>
              </View>
            );
          })}
        </Card>
      )}
    </View>
  );
}

function formatTrendLabel(period: string, granularity: TrendGranularity): string {
  if (granularity === 'weekly') {
    // "2026-W09" -> "W9"
    const match = period.match(/W(\d+)/);
    return match ? `W${parseInt(match[1], 10)}` : period;
  }
  // "2026-03" -> "Mar" or just the month number
  const match = period.match(/-(\d{2})$/);
  if (match) {
    const monthNum = parseInt(match[1], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthNum - 1] || period;
  }
  return period;
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  periodSelector: {
    marginBottom: spacing.sm,
  },
  section: {
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '31%',
    flexGrow: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  allTimeSummary: {
    fontSize: fontSize.sm,
  },
  // Ranking
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rankNumber: {
    width: 32,
    alignItems: 'center',
  },
  rankMedal: {
    fontSize: 20,
  },
  rankText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  rankStats: {
    alignItems: 'flex-end',
  },
  rankValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  rankSub: {
    fontSize: fontSize.xs,
  },
  // Trends chart
  chartContainer: {
    paddingVertical: spacing.sm,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: spacing.xs,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: borderRadius.sm,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    marginTop: 4,
  },
  barValue: {
    fontSize: 8,
  },
  chartUnit: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  // Sport types
  sportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sportName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  sportStat: {
    fontSize: fontSize.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});