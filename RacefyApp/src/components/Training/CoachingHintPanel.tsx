import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import { SessionHintCard } from './SessionHintCard';
import type { CoachingHint } from '../../types/api';

interface Props {
  coachingHint: CoachingHint;
}

export function CoachingHintPanel({ coachingHint }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Ionicons name="bulb-outline" size={22} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('training.coachingHints.sectionTitle')}
        </Text>
      </View>

      {/* Week Overview */}
      <View style={[styles.overviewCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
        <Text style={[styles.overviewLabel, { color: colors.primary }]}>
          {t('training.coachingHints.weekOverview')}
        </Text>
        <Text style={[styles.overviewText, { color: colors.textPrimary }]}>
          {coachingHint.week_overview}
        </Text>
      </View>

      {/* Session Hint Cards */}
      {coachingHint.session_hints.map((hint) => (
        <SessionHintCard key={hint.session_order} hint={hint} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  overviewCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  overviewLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  overviewText: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
});
