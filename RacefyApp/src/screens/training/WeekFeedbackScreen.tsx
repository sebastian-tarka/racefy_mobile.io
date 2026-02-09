import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { spacing, fontSize, borderRadius } from '../../theme';
import { ScreenHeader, Loading } from '../../components';
import { FeedbackSummaryHeader } from '../../components/Training/FeedbackSummaryHeader';
import { ComplianceRings } from '../../components/Training/ComplianceRings';
import { CoachMessageCard } from '../../components/Training/CoachMessageCard';
import { ActivityMatchCard } from '../../components/Training/ActivityMatchCard';
import { HighlightsGrid } from '../../components/Training/HighlightsGrid';
import { TrendIndicator } from '../../components/Training/TrendIndicator';
import type { RootStackParamList } from '../../navigation/types';
import type { WeekFeedback } from '../../types/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'WeekFeedback'>;

interface Props {
  navigation: NavigationProp;
  route: RoutePropType;
}

export function WeekFeedbackScreen({ navigation, route }: Props) {
  const { weekId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [feedback, setFeedback] = useState<WeekFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeedback = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const data = await api.getWeekFeedback(weekId);
      setFeedback(data);

      logger.info('training', 'Week feedback loaded', {
        weekId,
        weekNumber: data.week_number,
        overallRating: data.overall_rating,
      });
    } catch (err: any) {
      logger.error('training', 'Failed to load week feedback', { error: err, weekId });
      setError(err.message || t('training.feedback.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [weekId, t]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadFeedback(true);
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  if (error || !feedback) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader
          title={t('training.feedback.title', { number: '...' })}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error || t('training.feedback.loadError')}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => loadFeedback()}
          >
            <Text style={[styles.retryText, { color: colors.white }]}>
              {t('training.feedback.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('training.feedback.title', { number: feedback.week_number })}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Summary Header */}
        <FeedbackSummaryHeader
          overallRating={feedback.overall_rating}
          programName={feedback.program_name}
          weekNumber={feedback.week_number}
          programGoal={feedback.program_goal}
        />

        {/* Compliance Rings */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('training.feedback.compliance.sectionTitle')}
        </Text>
        <ComplianceRings compliance={feedback.compliance} />

        {/* Coach Messages */}
        {feedback.coach_messages.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('training.feedback.coachMessages.sectionTitle')}
            </Text>
            {feedback.coach_messages.map((msg, idx) => (
              <CoachMessageCard key={idx} message={msg} />
            ))}
            <View style={styles.sectionSpacer} />
          </>
        )}

        {/* Activity Matching */}
        {feedback.activity_matching.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('training.feedback.activityMatching.sectionTitle')}
            </Text>
            {feedback.activity_matching.map((match, idx) => (
              <ActivityMatchCard
                key={idx}
                match={match}
                onPress={(activityId) => navigation.navigate('ActivityDetail', { activityId })}
              />
            ))}
            <View style={styles.sectionSpacer} />
          </>
        )}

        {/* Highlights + Consistency */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('training.feedback.highlights.sectionTitle')}
        </Text>
        <HighlightsGrid
          highlights={feedback.highlights}
          consistencyScore={feedback.consistency_score}
        />

        {/* Trends */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('training.feedback.trends.sectionTitle')}
        </Text>
        <TrendIndicator trends={feedback.trends} />

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  sectionSpacer: {
    height: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  retryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});
