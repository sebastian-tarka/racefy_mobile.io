import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../../../../theme';
import type { HomeSection } from '../../../../../types/api';

interface WeeklyInsightSectionProps {
  section: HomeSection;
  onPress?: () => void;
}

/**
 * Weekly Insight section component.
 * Shows a summary of the user's weekly activity progress.
 */
export function WeeklyInsightSection({ section, onPress }: WeeklyInsightSectionProps) {
  const { colors } = useTheme();

  const stats = section.stats;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.info + '20' }]}>
          <Ionicons name="bar-chart" size={24} color={colors.info} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {section.title}
          </Text>
          {section.message && (
            <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
              {section.message}
            </Text>
          )}
        </View>
        {section.cta && (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        )}
      </View>

      {stats && (
        <View style={[styles.statsContainer, { borderTopColor: colors.border }]}>
          {stats.activities_count !== undefined && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats.activities_count}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                aktywności
              </Text>
            </View>
          )}
          {stats.total_distance_km !== undefined && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats.total_distance_km.toFixed(1)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                km
              </Text>
            </View>
          )}
          {stats.streak_days !== undefined && stats.streak_days > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {stats.streak_days}🔥
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                dni z rzędu
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  message: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
