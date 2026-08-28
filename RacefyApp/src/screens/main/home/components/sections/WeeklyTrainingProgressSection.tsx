import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../../../../theme';
import type { HomeSection, WeeklyTrainingProgressMeta } from '../../../../../types/api';

interface WeeklyTrainingProgressSectionProps {
  section: HomeSection;
  onPress?: () => void;
}

/**
 * Weekly Training Progress section.
 *
 * Shows how far the user is through the planned sessions of the current
 * training week, plus the weekly streak when the backend reports one.
 */
export function WeeklyTrainingProgressSection({
  section,
  onPress,
}: WeeklyTrainingProgressSectionProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const meta = section.meta as WeeklyTrainingProgressMeta | undefined;
  const completed = meta?.completed ?? 0;
  const planned = meta?.planned ?? 0;
  // `remaining` and `all_done` are optional in the payload — derive them.
  const remaining = meta?.remaining ?? Math.max(planned - completed, 0);
  const allDone = meta?.all_done ?? (planned > 0 && remaining === 0);
  const streakWeeks = meta?.streak_weeks ?? 0;

  const percent = planned > 0 ? Math.min(Math.round((completed / planned) * 100), 100) : 0;
  const accent = allDone ? colors.success : colors.primary;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: accent + '20' }]}>
          <Ionicons name={allDone ? 'checkmark-done' : 'calendar'} size={24} color={accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{section.title}</Text>
          {section.message && (
            <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
              {section.message}
            </Text>
          )}
        </View>
        {section.cta && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
      </View>

      {planned > 0 && (
        <View style={[styles.progressContainer, { borderTopColor: colors.border }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              {t('home.training.sessionsDone', { completed, planned })}
            </Text>
            {streakWeeks > 0 && (
              <Text style={[styles.streak, { color: colors.warning }]}>
                {t('home.training.streakWeeks', { count: streakWeeks })}
              </Text>
            )}
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[styles.progressFill, { width: `${percent}%`, backgroundColor: accent }]}
            />
          </View>
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
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  streak: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
