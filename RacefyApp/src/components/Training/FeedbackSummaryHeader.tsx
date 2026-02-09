import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import { Card } from '../../components';
import type { OverallRating } from '../../types/api';

interface Props {
  overallRating: OverallRating;
  programName: string;
  weekNumber: number;
  programGoal: string | null;
}

const RATING_COLORS: Record<OverallRating, string> = {
  excellent: '#10b981',
  good: '#3b82f6',
  needs_improvement: '#f59e0b',
  poor: '#ef4444',
};

export function FeedbackSummaryHeader({ overallRating, programName, weekNumber, programGoal }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const ratingColor = RATING_COLORS[overallRating];

  return (
    <Card style={styles.card}>
      <View style={[styles.ratingBadge, { backgroundColor: ratingColor + '15' }]}>
        <Ionicons name="star" size={20} color={ratingColor} />
        <Text style={[styles.ratingText, { color: ratingColor }]}>
          {t(`training.feedback.summaryHeader.${overallRating}`)}
        </Text>
      </View>
      <Text style={[styles.programName, { color: colors.textPrimary }]}>
        {programName}
      </Text>
      <Text style={[styles.weekInfo, { color: colors.textSecondary }]}>
        {t('training.feedback.title', { number: weekNumber })}
        {programGoal ? ` · ${programGoal}` : ''}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  ratingText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  programName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  weekInfo: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
