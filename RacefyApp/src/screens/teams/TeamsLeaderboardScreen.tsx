import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useTheme, useAuth } from '../../hooks';
import { useTeamsLeaderboard } from '../../hooks/useTeamsLeaderboard';
import { ScreenContainer, ScreenHeader, Avatar, OptionSelector, EmptyState } from '../../components';
import { spacing, fontSize, borderRadius } from '../../theme';
import { formatTotalTime } from '../../utils/formatters';
import type { StatsPeriod, LeaderboardSortBy, TeamLeaderboardEntry } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamsLeaderboard'>;

const PERIOD_OPTIONS: { value: StatsPeriod | 'all_time'; labelKey: string }[] = [
  { value: 'this_month', labelKey: 'teams.periodThisMonth' },
  { value: 'this_week', labelKey: 'teams.periodThisWeek' },
  { value: 'this_year', labelKey: 'teams.periodThisYear' },
];

const SORT_OPTIONS: { value: LeaderboardSortBy; labelKey: string }[] = [
  { value: 'distance', labelKey: 'teams.sortDistance' },
  { value: 'duration', labelKey: 'teams.sortDuration' },
  { value: 'activities', labelKey: 'teams.sortActivities' },
  { value: 'members', labelKey: 'teams.sortMembers' },
];

export function TeamsLeaderboardScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [period, setPeriod] = useState<StatsPeriod>('this_month');
  const [sortBy, setSortBy] = useState<LeaderboardSortBy>('distance');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { entries, isLoading, error, hasMore, loadMore, refetch } = useTeamsLeaderboard(sortBy, period);

  const periodOptions = useMemo(() =>
    PERIOD_OPTIONS.map(o => ({ value: o.value as StatsPeriod, label: t(o.labelKey) })),
    [t],
  );

  const sortOptions = useMemo(() =>
    SORT_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleTeamPress = useCallback((slug: string) => {
    navigation.navigate('TeamDetail', { slug });
  }, [navigation]);

  const formatDist = useCallback((meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} km`;
    return `${meters} m`;
  }, []);

  const getSortValue = useCallback((entry: TeamLeaderboardEntry) => {
    switch (sortBy) {
      case 'distance': return formatDist(entry.total_distance);
      case 'duration': return formatTotalTime(entry.total_duration);
      case 'activities': return `${entry.activities_count}`;
      case 'members': return `${entry.members_count}`;
      case 'elevation': return `${entry.total_elevation.toLocaleString()} m`;
      default: return formatDist(entry.total_distance);
    }
  }, [sortBy, formatDist]);

  const renderItem = useCallback(({ item }: { item: TeamLeaderboardEntry }) => {
    const isTop3 = item.rank <= 3;
    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPress={() => handleTeamPress(item.team_slug)}
        activeOpacity={0.7}
      >
        <View style={styles.rankCol}>
          {item.rank === 1 ? (
            <Text style={styles.rankEmoji}>{'\uD83C\uDFC6'}</Text>
          ) : isTop3 ? (
            <Text style={[styles.rankBold, { color: item.rank === 2 ? '#9ca3af' : '#b45309' }]}>
              #{item.rank}
            </Text>
          ) : (
            <Text style={[styles.rankNum, { color: colors.textMuted }]}>#{item.rank}</Text>
          )}
        </View>
        <Avatar uri={item.team_avatar} name={item.team_name} size="md" />
        <View style={styles.teamInfo}>
          <Text style={[styles.teamName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.team_name}
          </Text>
          <Text style={[styles.teamMeta, { color: colors.textMuted }]}>
            {item.members_count} {t('teams.members').toLowerCase()} {' \u2022 '}
            {item.activities_count} act.
          </Text>
        </View>
        <Text style={[styles.sortValue, { color: colors.primary }]}>
          {getSortValue(item)}
        </Text>
      </TouchableOpacity>
    );
  }, [colors, handleTeamPress, getSortValue, t]);

  const ListHeader = useMemo(() => (
    <View style={styles.headerContent}>
      <OptionSelector
        value={period}
        onChange={setPeriod}
        options={periodOptions}
        showLabel={false}
        containerStyle={{ marginBottom: spacing.xs }}
      />
      <OptionSelector
        value={sortBy}
        onChange={setSortBy}
        options={sortOptions}
        showLabel={false}
      />
    </View>
  ), [period, sortBy, periodOptions, sortOptions]);

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('teams.teamLeaderboard')}
        showBack
        onBack={() => navigation.goBack()}
      />
      <FlatList
        data={entries}
        keyExtractor={(item) => `team-lb-${item.team_id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="trophy-outline"
              title={t('teams.noLeaderboardEntries')}
            />
          ) : null
        }
        ListFooterComponent={
          isLoading ? <ActivityIndicator style={{ padding: spacing.lg }} color={colors.primary} /> : null
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rankCol: {
    width: 36,
    alignItems: 'center',
  },
  rankEmoji: {
    fontSize: 22,
  },
  rankBold: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  rankNum: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  teamMeta: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  sortValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});