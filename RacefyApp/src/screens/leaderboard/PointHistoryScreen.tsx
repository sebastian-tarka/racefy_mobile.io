import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PointHistoryList, ScreenContainer, ScreenHeader } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { usePointHistory } from '../../hooks/usePointHistory';
import { usePointStats } from '../../hooks/usePointStats';
import { borderRadius, msFont, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { PointTransaction } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'PointHistory'>;
type Filter = 'all' | 'activity' | 'event';

const FILTERS: Filter[] = ['all', 'activity', 'event'];

/** Two of the five transaction types come from events; the rest are training. */
const isEventTransaction = (tx: PointTransaction) =>
  tx.type === 'event_place' || tx.type === 'event_finish';

/**
 * Where the points came from (design "Racefy v2" → PointsHistoryScreen).
 *
 * Opens with the split the athlete actually wonders about — training versus
 * events — because a flat list of "+34" tells you nothing about which habit is
 * earning. Both numbers come straight from `UserPointStats`.
 */
export function PointHistoryScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');

  const { transactions, isLoading, isLoadingMore, error, hasMore, loadMore } = usePointHistory({
    autoLoad: true,
  });
  const { stats } = usePointStats();

  // A display filter over what is loaded, not a query: "events" spans two
  // transaction types and the endpoint takes a single one, so filtering server
  // side would silently drop half the event rows.
  const visible = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter((tx) =>
      filter === 'event' ? isEventTransaction(tx) : !isEventTransaction(tx),
    );
  }, [transactions, filter]);

  const total = stats?.total_points ?? 0;
  const split: [string, number, string][] = [
    [t('compete.history.fromActivities'), stats?.activity_points ?? 0, colors.primary],
    [t('compete.history.fromEvents'), stats?.event_points ?? 0, colors.warning],
  ];

  const header = (
    <View>
      <View
        style={[
          styles.summary,
          { backgroundColor: colors.cardBackground, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
          {t('compete.history.total')}
        </Text>
        <View style={styles.summaryValueRow}>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
            {total.toLocaleString()}
          </Text>
          <Text style={[styles.summaryUnit, { color: colors.textMuted }]}>
            {t('compete.history.entries', { count: stats?.total_transactions ?? 0 })}
          </Text>
        </View>

        <View style={styles.splitRow}>
          {split.map(([label, value, tint]) => (
            <View key={label} style={[styles.split, { backgroundColor: colors.background }]}>
              <Text style={[styles.splitLabel, { color: colors.textSecondary }]}>{label}</Text>
              <Text style={[styles.splitValue, { color: colors.textPrimary }]}>
                {value.toLocaleString()}
              </Text>
              <View style={[styles.track, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.trackFill,
                    {
                      backgroundColor: tint,
                      width: total > 0 ? `${Math.round((value / total) * 100)}%` : '0%',
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((id) => {
          const active = filter === id;
          return (
            <TouchableOpacity
              key={id}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.textPrimary : 'transparent',
                  borderColor: active ? colors.textPrimary : colors.border,
                },
              ]}
              onPress={() => setFilter(id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[styles.chipText, { color: active ? colors.white : colors.textSecondary }]}
              >
                {t(`compete.history.filters.${id}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScreenContainer glow={false}>
      <ScreenHeader
        title={t('leaderboard.history.title')}
        showBack
        onBack={() => navigation.goBack()}
      />
      <PointHistoryList
        transactions={visible}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        error={error}
        hasMore={hasMore && filter === 'all'}
        onLoadMore={loadMore}
        ListHeaderComponent={header}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
  },
  summaryLabel: {
    fontSize: msFont(9.5),
    fontWeight: '600',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginTop: 3,
  },
  summaryValue: {
    fontSize: msFont(34),
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  summaryUnit: {
    flexShrink: 1,
    fontSize: msFont(13),
  },
  splitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md + 2,
  },
  split: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  splitLabel: {
    fontSize: msFont(10.5),
    fontWeight: '600',
  },
  splitValue: {
    fontSize: msFont(17),
    fontWeight: '500',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 4,
    borderRadius: 999,
    marginTop: 7,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 999,
  },
  filters: {
    flexDirection: 'row',
    gap: 7,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm + 2,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: msFont(12),
    fontWeight: '600',
  },
});
