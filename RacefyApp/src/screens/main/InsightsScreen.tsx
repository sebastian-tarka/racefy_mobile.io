import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ScreenContainer,
  ScreenHeader,
  Loading,
  EmptyState,
  SegmentedControl,
} from '../../components';
import {
  SummaryCard,
  ComparisonCard,
  StreakCard,
  TrendsCard,
  TimePatternsCard,
  MilestonesCard,
  WeatherCard,
  RoutesCard,
  LockedInsightCard,
  WeeklyVolumeCard,
} from '../../components/insights';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { spacing, fontSize } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { InsightsRangeKey, InsightsResponse, LockedSection } from '../../types/insights';
import { formatIntlDate } from '../../utils/dateFormat';

type Props = NativeStackScreenProps<RootStackParamList, 'Insights'>;

const RANGES: InsightsRangeKey[] = ['7d', '30d', 'season', 'all'];

export function InsightsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Same default as the web page: a month answers "how am I doing" better
  // than a lifetime total.
  const [range, setRange] = useState<InsightsRangeKey>('30d');
  const [data, setData] = useState<InsightsResponse['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (!data) {
        // Switching the range keeps the old figures on screen until the new
        // ones arrive; only the very first load shows the full-screen spinner.
        setIsLoading(true);
      }
      try {
        const response = await api.getInsights(range);
        setData(response.data);
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('common.error');
        logger.error('api', 'Failed to load insights', { error: err });
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `data` only decides the spinner
    [t, range],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const isLocked = useCallback(
    (sectionName: string): LockedSection | undefined => {
      return data?.locked_sections.find((s) => s.name === sectionName);
    },
    [data],
  );

  const renderLockedOrSection = useCallback(
    (
      sectionName: string,
      icon: string,
      titleKey: string,
      renderContent: () => React.ReactNode,
    ): React.ReactNode => {
      const locked = isLocked(sectionName);
      if (locked) {
        return (
          <LockedInsightCard
            key={sectionName}
            title={t(titleKey)}
            icon={icon as never}
            requiredTier={locked.required_tier}
          />
        );
      }
      return renderContent();
    },
    [isLocked, t],
  );

  if (isLoading) {
    return (
      <ScreenContainer edges={['top']}>
        <ScreenHeader
          title={t('insights.title')}
          showBack
          onBack={() => navigation.goBack()}
          rightAction={
            <TouchableOpacity
              onPress={() => navigation.navigate('AiActivityReports')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={t('insights.aiReports.viewAll')}
            >
              <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          }
        />
        <Loading fullScreen message={t('common.loading')} />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer edges={['top']}>
        <ScreenHeader
          title={t('insights.title')}
          showBack
          onBack={() => navigation.goBack()}
          rightAction={
            <TouchableOpacity
              onPress={() => navigation.navigate('AiActivityReports')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={t('insights.aiReports.viewAll')}
            >
              <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          }
        />
        <EmptyState
          icon="alert-circle-outline"
          title={t('common.error')}
          message={error}
          actionLabel={t('common.tryAgain')}
          onAction={() => loadData()}
        />
      </ScreenContainer>
    );
  }

  if (!data || !data.has_data) {
    return (
      <ScreenContainer edges={['top']}>
        <ScreenHeader
          title={t('insights.title')}
          showBack
          onBack={() => navigation.goBack()}
          rightAction={
            <TouchableOpacity
              onPress={() => navigation.navigate('AiActivityReports')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={t('insights.aiReports.viewAll')}
            >
              <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          }
        />
        <EmptyState
          icon="fitness-outline"
          title={t('insights.empty.title')}
          message={t('insights.empty.message')}
        />
      </ScreenContainer>
    );
  }

  const { sections, comparisons } = data;
  const summary = sections.activity_summary;
  const emptyRange = range !== 'all' && summary?.total_count === 0;
  const canSeeWeekly = data.tier !== 'free';
  const openActivity = (activityId: number) =>
    navigation.navigate('ActivityDetail', { activityId });

  return (
    <ScreenContainer edges={['top']}>
      <ScreenHeader
        title={t('insights.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('AiActivityReports')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={t('insights.aiReports.viewAll')}
          >
            <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('insights.subtitle')}
        </Text>
        {data.aggregated_at && (
          <Text style={[styles.updatedAt, { color: colors.textMuted }]}>
            {t('insights.updatedAt', { date: formatIntlDate(data.aggregated_at) })}
          </Text>
        )}

        <SegmentedControl
          options={RANGES.map((value) => ({ value, label: t(`insights.range.${value}`) }))}
          value={range}
          onChange={setRange}
          style={styles.range}
        />
        {data.range && range !== 'all' && (
          <Text style={[styles.rangeNote, { color: colors.textMuted }]}>
            {t('insights.range.note')}
          </Text>
        )}

        {/* 1. Activity Summary — for the chosen range */}
        {emptyRange ? (
          <View style={[styles.emptyRange, { borderColor: colors.border }]}>
            <Ionicons name="calendar-clear-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.emptyRangeText, { color: colors.textSecondary }]}>
              {t('insights.range.empty')}
            </Text>
          </View>
        ) : (
          summary && <SummaryCard data={summary} />
        )}

        {/* 2. Comparisons */}
        {comparisons && Object.keys(comparisons).length > 0 && (
          <ComparisonCard data={comparisons} />
        )}

        {/* 3. Streak */}
        {sections.streak_data && (
          <StreakCard data={sections.streak_data} onOpenActivity={openActivity} />
        )}

        {/* 4. Trends */}
        {renderLockedOrSection('trends', 'trending-up', 'insights.trends.title', () =>
          sections.trends ? (
            <TrendsCard key="trends" data={sections.trends} showBreakdown={!canSeeWeekly} />
          ) : null,
        )}

        {/* 4b. Eight weeks per sport, with tempo (Plus+) */}
        {canSeeWeekly ? (
          <WeeklyVolumeCard />
        ) : (
          <LockedInsightCard
            title={t('insights.weekly.title')}
            icon="bar-chart"
            requiredTier="plus"
          />
        )}

        {/* 5. Time Patterns */}
        {renderLockedOrSection('time_patterns', 'time', 'insights.timePatterns.title', () =>
          sections.time_patterns ? (
            <TimePatternsCard key="time_patterns" data={sections.time_patterns} />
          ) : null,
        )}

        {/* 6. Milestones */}
        {renderLockedOrSection('milestone_progress', 'trophy', 'insights.milestones.title', () =>
          sections.milestone_progress ? (
            <MilestonesCard key="milestones" data={sections.milestone_progress} />
          ) : null,
        )}

        {/* 7. Weather */}
        {renderLockedOrSection('weather_profile', 'partly-sunny', 'insights.weather.title', () =>
          sections.weather_profile ? (
            <WeatherCard key="weather" data={sections.weather_profile} />
          ) : null,
        )}

        {/* 8. Routes */}
        {renderLockedOrSection('favorite_routes', 'map', 'insights.routes.title', () =>
          sections.favorite_routes ? (
            <RoutesCard
              key="routes"
              routes={sections.favorite_routes}
              fingerprints={sections.route_fingerprints}
            />
          ) : null,
        )}

        {/* Also check route_fingerprints locked separately */}
        {isLocked('route_fingerprints') && !isLocked('favorite_routes') && (
          <LockedInsightCard
            title={t('insights.routes.fingerprints')}
            icon="navigate"
            requiredTier={isLocked('route_fingerprints')!.required_tier}
          />
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  subtitle: {
    fontSize: fontSize.md,
    marginBottom: spacing.xs,
  },
  updatedAt: {
    fontSize: fontSize.xs,
    marginBottom: spacing.md,
  },
  range: {
    marginBottom: spacing.xs,
  },
  rangeNote: {
    fontSize: fontSize.xs,
    marginBottom: spacing.md,
  },
  emptyRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  emptyRangeText: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  bottomSpacer: {
    height: 80,
  },
});
