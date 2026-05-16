import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Button, ScreenContainer, ScreenHeader } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { useSubscription } from '../../hooks/useSubscription';
import { useUnits } from '../../hooks/useUnits';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { useRefreshOn } from '../../services/refreshEvents';
import { spacing, fontSize, borderRadius } from '../../theme';
import { formatMetricValue, paceStatusColor } from '../../utils/goalHelpers';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { UserGoal } from '../../types/goals';

type Props = NativeStackScreenProps<RootStackParamList, 'Goals'>;

export function GoalsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { features } = useSubscription();
  const { units } = useUnits();

  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchGoals = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const data = await api.listGoals();
      setGoals(data);
    } catch (error: any) {
      logger.error('api', 'Failed to load goals', { error: error.message });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
    }, [fetchGoals])
  );

  useRefreshOn('goals', () => fetchGoals());
  useRefreshOn('activities', () => fetchGoals());

  const activeCount = goals.filter((g) => g.is_active).length;
  const max = features.goals_max_active;
  const slotsLabel = max === -1
    ? t('goals.unlimited')
    : t('goals.slotsUsed', { used: activeCount, max });

  const renderGoal = ({ item }: { item: UserGoal }) => {
    const target = formatMetricValue(item.target_value, item.metric, units);
    const achieved = item.progress
      ? formatMetricValue(item.progress.achieved_value, item.metric, units)
      : '—';
    const percent = item.progress?.percent ?? 0;
    const daysLeft = item.progress?.days_left ?? 0;
    const paceStatus = item.progress?.pace_status ?? 'on_track';
    const statusColor = paceStatusColor(paceStatus, {
      primary: colors.primary,
      warning: colors.warning,
      textSecondary: colors.textSecondary,
    });
    const sportLabel = item.sport_type?.name ?? t('goals.allSports');
    const periodLabel = t(`goals.period.${item.period}`);
    const metricLabel = t(`goals.metric.${item.metric}`);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={() => navigation.navigate('GoalDetail', { goalId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '22' }]}>
            <Ionicons name="flag" size={20} color={colors.primary} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {periodLabel} · {metricLabel}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {sportLabel}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {t(`goals.status.${paceStatus === 'on_track' ? 'onTrack' : paceStatus}`)}
            </Text>
          </View>
        </View>

        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: statusColor,
                width: `${Math.min(percent, 100)}%`,
              },
            ]}
          />
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.percent, { color: colors.textPrimary }]}>{percent}%</Text>
          <Text style={[styles.target, { color: colors.textSecondary }]}>
            {achieved} / {target}
          </Text>
          {daysLeft > 0 && (
            <Text style={[styles.daysLeft, { color: colors.textMuted }]}>
              {daysLeft === 1
                ? t('goals.status.daysLeft_one', { count: daysLeft })
                : t('goals.status.daysLeft_other', { count: daysLeft })}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>🎯</Text>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          {t('goals.empty.headline')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {t('goals.empty.subtitle')}
        </Text>
        <Button
          title={t('goals.empty.cta')}
          onPress={() => navigation.navigate('GoalForm', {})}
          variant="primary"
          style={styles.emptyCta}
        />
      </View>
    );
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('goals.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('GoalForm', {})}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={t('goals.actions.create')}
          >
            <Ionicons name="add" size={26} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderGoal}
          contentContainerStyle={[
            styles.listContent,
            goals.length === 0 && styles.emptyList,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchGoals('refresh')}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            goals.length > 0 ? (
              <Text style={[styles.slotsLabel, { color: colors.textSecondary }]}>
                {slotsLabel}
              </Text>
            ) : null
          }
          ListEmptyComponent={renderEmpty}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  slotsLabel: {
    fontSize: fontSize.sm,
    marginVertical: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: fontSize.xs,
    marginTop: 2,
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
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  percent: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  target: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  daysLeft: {
    fontSize: fontSize.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.4,
  },
  emptyCta: {
    minWidth: 200,
    marginTop: spacing.md,
  },
});
