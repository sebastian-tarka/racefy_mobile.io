import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../../hooks/useTheme';
import { useUnits } from '../../../../../hooks/useUnits';
import { spacing, fontSize, borderRadius } from '../../../../../theme';
import type { HomeSection } from '../../../../../types/api';

interface LastActivitySummarySectionProps {
  section: HomeSection;
  onPress?: () => void;
}

/**
 * Last Activity Summary section component.
 * Shows a brief summary of the user's most recent activity.
 */
export function LastActivitySummarySection({ section, onPress }: LastActivitySummarySectionProps) {
  const { colors } = useTheme();
  const { formatDistanceFromKm } = useUnits();

  const activity = section.activity;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="trophy" size={24} color={colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {section.title}
          </Text>
          {section.message && (
            <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
              {section.message}
            </Text>
          )}
          {activity && (
            <View style={styles.statsRow}>
              {activity.distance_km && (
                <View style={styles.stat}>
                  <Ionicons name="navigate" size={14} color={colors.textSecondary} />
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    {formatDistanceFromKm(activity.distance_km)}
                  </Text>
                </View>
              )}
              {activity.duration_minutes && (
                <View style={styles.stat}>
                  <Ionicons name="time" size={14} color={colors.textSecondary} />
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    {activity.duration_minutes.toFixed(1)} min
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        {section.cta && (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: fontSize.sm,
  },
});
