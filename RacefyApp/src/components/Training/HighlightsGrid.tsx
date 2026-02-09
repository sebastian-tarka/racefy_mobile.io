import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import { Card } from '../../components';
import type { Highlights } from '../../types/api';

interface Props {
  highlights: Highlights;
  consistencyScore: number;
}

interface StatItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | null;
}

export function HighlightsGrid({ highlights, consistencyScore }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const stats: StatItem[] = [
    {
      icon: 'map-outline',
      label: t('training.feedback.highlights.longestDistance'),
      value: highlights.longest_activity_distance_km != null
        ? `${highlights.longest_activity_distance_km.toFixed(1)} km`
        : null,
    },
    {
      icon: 'time-outline',
      label: t('training.feedback.highlights.longestDuration'),
      value: highlights.longest_activity_duration_formatted,
    },
    {
      icon: 'trending-up-outline',
      label: t('training.feedback.highlights.elevation'),
      value: highlights.total_elevation_gain > 0
        ? `${highlights.total_elevation_gain} m`
        : null,
    },
    {
      icon: 'flame-outline',
      label: t('training.feedback.highlights.calories'),
      value: highlights.total_calories > 0
        ? `${highlights.total_calories} kcal`
        : null,
    },
    {
      icon: 'speedometer-outline',
      label: t('training.feedback.highlights.avgPace'),
      value: highlights.avg_pace != null
        ? `${highlights.avg_pace.toFixed(2)} /km`
        : null,
    },
  ];

  const visibleStats = stats.filter(s => s.value != null);
  const barWidth = Math.min(100, Math.max(0, consistencyScore));

  return (
    <Card style={styles.card}>
      {visibleStats.length > 0 && (
        <View style={styles.grid}>
          {visibleStats.map((stat, idx) => (
            <View key={idx} style={[styles.statCell, { backgroundColor: colors.border + '40' }]}>
              <Ionicons name={stat.icon} size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Consistency Bar */}
      <View style={styles.consistencySection}>
        <View style={styles.consistencyHeader}>
          <Text style={[styles.consistencyLabel, { color: colors.textPrimary }]}>
            {t('training.feedback.highlights.consistency')}
          </Text>
          <Text style={[styles.consistencyValue, { color: colors.primary }]}>
            {consistencyScore}%
          </Text>
        </View>
        <View style={[styles.barBackground, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.barFill,
              {
                backgroundColor: colors.primary,
                width: `${barWidth}%`,
              },
            ]}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCell: {
    width: '48%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  consistencySection: {
    gap: spacing.sm,
  },
  consistencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  consistencyLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  consistencyValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  barBackground: {
    height: 10,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.md,
  },
});
