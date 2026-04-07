import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, ScreenHeader, Loading, EmptyState } from '../../components';
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
} from '../../components/insights';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { spacing, fontSize, fontWeight } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { InsightsResponse, LockedSection } from '../../types/insights';
import type { SubscriptionTier } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Insights'>;

const SECTION_CONFIG: {
  key: string;
  icon: string;
  titleKey: string;
}[] = [
  { key: 'trends', icon: 'trending-up', titleKey: 'insights.trends.title' },
  { key: 'time_patterns', icon: 'time', titleKey: 'insights.timePatterns.title' },
  { key: 'milestone_progress', icon: 'trophy', titleKey: 'insights.milestones.title' },
  { key: 'weather_profile', icon: 'partly-sunny', titleKey: 'insights.weather.title' },
  { key: 'favorite_routes', icon: 'map', titleKey: 'insights.routes.title' },
];

export function InsightsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [data, setData] = useState<InsightsResponse['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const response = await api.getInsights();
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
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const isLocked = useCallback((sectionName: string): LockedSection | undefined => {
    return data?.locked_sections.find(s => s.name === sectionName);
  }, [data]);

  const renderLockedOrSection = useCallback((
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
  }, [isLocked, t]);

  if (isLoading) {
    return (
      <ScreenContainer edges={['top']}>
        <ScreenHeader title={t('insights.title')} showBack onBack={() => navigation.goBack()} />
        <Loading fullScreen message={t('common.loading')} />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer edges={['top']}>
        <ScreenHeader title={t('insights.title')} showBack onBack={() => navigation.goBack()} />
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
        <ScreenHeader title={t('insights.title')} showBack onBack={() => navigation.goBack()} />
        <EmptyState
          icon="fitness-outline"
          title={t('insights.empty.title')}
          message={t('insights.empty.message')}
        />
      </ScreenContainer>
    );
  }

  const { sections, comparisons } = data;

  return (
    <ScreenContainer edges={['top']}>
      <ScreenHeader title={t('insights.title')} showBack onBack={() => navigation.goBack()} />
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
            {t('insights.updatedAt', { date: new Date(data.aggregated_at).toLocaleDateString() })}
          </Text>
        )}

        {/* 1. Activity Summary */}
        {sections.activity_summary && (
          <SummaryCard data={sections.activity_summary} />
        )}

        {/* 2. Comparisons */}
        {comparisons && Object.keys(comparisons).length > 0 && (
          <ComparisonCard data={comparisons} />
        )}

        {/* 3. Streak */}
        {sections.streak_data && (
          <StreakCard data={sections.streak_data} />
        )}

        {/* 4. Trends */}
        {renderLockedOrSection('trends', 'trending-up', 'insights.trends.title', () =>
          sections.trends ? <TrendsCard key="trends" data={sections.trends} /> : null
        )}

        {/* 5. Time Patterns */}
        {renderLockedOrSection('time_patterns', 'time', 'insights.timePatterns.title', () =>
          sections.time_patterns ? <TimePatternsCard key="time_patterns" data={sections.time_patterns} /> : null
        )}

        {/* 6. Milestones */}
        {renderLockedOrSection('milestone_progress', 'trophy', 'insights.milestones.title', () =>
          sections.milestone_progress ? <MilestonesCard key="milestones" data={sections.milestone_progress} /> : null
        )}

        {/* 7. Weather */}
        {renderLockedOrSection('weather_profile', 'partly-sunny', 'insights.weather.title', () =>
          sections.weather_profile ? <WeatherCard key="weather" data={sections.weather_profile} /> : null
        )}

        {/* 8. Routes */}
        {renderLockedOrSection('favorite_routes', 'map', 'insights.routes.title', () =>
          sections.favorite_routes ? (
            <RoutesCard
              key="routes"
              routes={sections.favorite_routes}
              fingerprints={sections.route_fingerprints}
            />
          ) : null
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
    marginBottom: spacing.lg,
  },
  bottomSpacer: {
    height: 80,
  },
});
