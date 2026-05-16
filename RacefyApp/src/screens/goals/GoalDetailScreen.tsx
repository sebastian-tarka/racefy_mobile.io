import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { BottomSheet, type BottomSheetOption, ScreenContainer, ScreenHeader } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { emitRefresh, useRefreshOn } from '../../services/refreshEvents';
import { spacing, fontSize, borderRadius } from '../../theme';
import { formatMetricValue, paceStatusColor } from '../../utils/goalHelpers';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type {
  GoalHistoryResponse,
  GoalPeriodStatus,
  UserGoal,
  UserGoalPeriodResult,
} from '../../types/goals';

type Props = NativeStackScreenProps<RootStackParamList, 'GoalDetail'>;

export function GoalDetailScreen({ navigation, route }: Props) {
  const { goalId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { units } = useUnits();

  const [goal, setGoal] = useState<UserGoal | null>(null);
  const [history, setHistory] = useState<GoalHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionsSheetVisible, setIsActionsSheetVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [g, h] = await Promise.all([
        api.getGoal(goalId),
        api.getGoalHistory(goalId).catch(() => null),
      ]);
      setGoal(g);
      if (h) setHistory(h);
    } catch (error: any) {
      if (error.status === 403 || error.status === 404) {
        navigation.goBack();
      } else {
        logger.error('api', 'Failed to load goal detail', { goalId, error: error.message });
      }
    } finally {
      setIsLoading(false);
    }
  }, [goalId, navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  useRefreshOn('goals', fetchData);
  useRefreshOn('activities', fetchData);

  const handleDelete = () => {
    Alert.alert('', t('goals.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('goals.actions.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteGoal(goalId);
            emitRefresh('goals');
            navigation.goBack();
          } catch (error: any) {
            Alert.alert('', error.message || t('common.error'));
          }
        },
      },
    ]);
  };

  if (isLoading || !goal) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('goals.title')} showBack onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const target = formatMetricValue(goal.target_value, goal.metric, units);
  const achieved = goal.progress
    ? formatMetricValue(goal.progress.achieved_value, goal.metric, units)
    : '—';
  const percent = goal.progress?.percent ?? 0;
  const expected = goal.progress?.expected_percent ?? 0;
  const daysLeft = goal.progress?.days_left ?? 0;
  const paceStatus = goal.progress?.pace_status ?? 'on_track';
  const statusColor = paceStatusColor(paceStatus, {
    primary: colors.primary,
    warning: colors.warning,
    textSecondary: colors.textSecondary,
  });
  const sportLabel = goal.sport_type?.name ?? t('goals.allSports');

  const meta = history?.meta;
  const historyMonths = meta?.history_months ?? 1;
  const historyRangeLabel = historyMonths === -1
    ? t('goals.detail.historyAll')
    : t('goals.detail.historyRange', { months: historyMonths });

  const sheetOptions: BottomSheetOption[] = [
    {
      id: 'edit',
      icon: 'create-outline',
      title: t('goals.actions.edit'),
      onPress: () => navigation.navigate('GoalForm', { goalId }),
    },
    {
      id: 'delete',
      icon: 'trash-outline',
      title: t('goals.actions.delete'),
      onPress: handleDelete,
      color: colors.error,
    },
  ];

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('goals.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => setIsActionsSheetVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            {t(`goals.period.${goal.period}`)} · {t(`goals.metric.${goal.metric}`)} · {sportLabel}
          </Text>
          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              <Text style={[styles.heroPercent, { color: colors.textPrimary }]}>{percent}%</Text>
              <Text style={[styles.heroValues, { color: colors.textSecondary }]}>
                {achieved} / {target}
              </Text>
            </View>
            <View style={styles.heroRight}>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {t(`goals.status.${paceStatus === 'on_track' ? 'onTrack' : paceStatus}`)}
                </Text>
              </View>
              {daysLeft > 0 && (
                <Text style={[styles.heroDays, { color: colors.textMuted }]}>
                  {daysLeft === 1
                    ? t('goals.status.daysLeft_one', { count: daysLeft })
                    : t('goals.status.daysLeft_other', { count: daysLeft })}
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: statusColor, width: `${Math.min(percent, 100)}%` }]} />
          </View>

          <Text style={[styles.heroPeriodRange, { color: colors.textMuted }]}>
            {goal.current_period_start} — {goal.current_period_end} · {t('goals.detail.linearExpected', { percent: expected })}
          </Text>
        </View>

        {/* Aggregates row */}
        {meta && meta.count > 0 && (
          <View style={[styles.aggregatesCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Stat label={t('goals.detail.metRatio')} value={`${meta.met_count}/${meta.count}`} colors={colors} />
            <Stat label={t('goals.detail.avgPercent')} value={`${meta.avg_percent}%`} colors={colors} />
            <Stat label={t('goals.detail.streak')} value={String(meta.current_streak)} colors={colors} />
            {meta.best && (
              <Stat label={t('goals.detail.bestPeriod')} value={`${meta.best.progress_percent}%`} colors={colors} />
            )}
          </View>
        )}

        {/* History timeline */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>
              {t('goals.detail.historyTitle')}
            </Text>
            <Text style={[styles.historyRange, { color: colors.textSecondary }]}>
              {historyRangeLabel}
            </Text>
          </View>

          {!history || history.data.length === 0 ? (
            <Text style={[styles.historyEmpty, { color: colors.textMuted }]}>
              {t('goals.detail.historyEmpty')}
            </Text>
          ) : (
            history.data.map((row) => (
              <HistoryRow key={row.id} row={row} colors={colors} t={t} />
            ))
          )}
        </View>
      </ScrollView>

      <BottomSheet
        visible={isActionsSheetVisible}
        onClose={() => setIsActionsSheetVisible(false)}
        options={sheetOptions}
      />
    </ScreenContainer>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const STATUS_COLORS: Record<GoalPeriodStatus, string> = {
  success: '#10b981',
  partial: '#f59e0b',
  missed: '#9ca3af',
};

function HistoryRow({
  row,
  colors,
  t,
}: {
  row: UserGoalPeriodResult;
  colors: any;
  t: (key: string) => string;
}) {
  const statusColor = STATUS_COLORS[row.status];
  return (
    <View style={[styles.historyRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.historyRowHeader}>
        <Text style={[styles.historyDate, { color: colors.textPrimary }]}>
          {row.period_start} → {row.period_end}
        </Text>
        <Text style={[styles.historyPercent, { color: statusColor }]}>
          {row.progress_percent}%
        </Text>
      </View>
      <View style={[styles.historyBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.historyBarFill,
            { backgroundColor: statusColor, width: `${Math.min(row.progress_percent, 100)}%` },
          ]}
        />
      </View>
      <Text style={[styles.historyStatus, { color: statusColor }]}>
        {t(`goals.detail.status.${row.status}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  heroLeft: {
    flex: 1,
  },
  heroPercent: {
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  heroValues: {
    fontSize: fontSize.md,
    marginTop: 2,
  },
  heroRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  heroDays: {
    fontSize: fontSize.xs,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  heroPeriodRange: {
    fontSize: fontSize.xs,
  },
  aggregatesCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
    textAlign: 'center',
  },
  historySection: {
    marginTop: spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  historyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  historyRange: {
    fontSize: fontSize.xs,
  },
  historyEmpty: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  historyRow: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  historyRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  historyDate: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  historyPercent: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  historyBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  historyBarFill: {
    height: '100%',
  },
  historyStatus: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
