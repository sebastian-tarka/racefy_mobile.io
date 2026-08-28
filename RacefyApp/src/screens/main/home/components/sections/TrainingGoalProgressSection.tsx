import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../../hooks/useTheme';
import { useUnits } from '../../../../../hooks/useUnits';
import { formatMetricValue, paceStatusColor } from '../../../../../utils/goalHelpers';
import { spacing, fontSize, borderRadius } from '../../../../../theme';
import type { GoalMetric, PaceStatus } from '../../../../../types/goals';
import type { HomeSection, TrainingGoalProgressMeta } from '../../../../../types/api';

interface TrainingGoalProgressSectionProps {
  section: HomeSection;
  onPress?: () => void;
}

const GOAL_METRICS: GoalMetric[] = ['distance', 'duration', 'elevation', 'activities_count'];

/**
 * The home payload describes the value with `unit`, while the goal helpers
 * work with `metric`. `metric` is sent too when the backend knows it — trust it
 * first, because `meters` alone cannot tell distance from elevation.
 */
function resolveMetric(meta?: TrainingGoalProgressMeta): GoalMetric {
  if (meta?.metric && (GOAL_METRICS as string[]).includes(meta.metric)) {
    return meta.metric as GoalMetric;
  }
  switch (meta?.unit) {
    case 'seconds':
      return 'duration';
    case 'count':
      return 'activities_count';
    case 'meters':
    default:
      return 'distance';
  }
}

/**
 * Training Goal Progress section.
 *
 * Shows progress towards the active goal for the current period, with the
 * pace status the backend computed (ahead / on track / behind).
 */
export function TrainingGoalProgressSection({
  section,
  onPress,
}: TrainingGoalProgressSectionProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { units } = useUnits();

  const meta = section.meta as TrainingGoalProgressMeta | undefined;
  const metric = resolveMetric(meta);
  const achieved = meta?.achieved_value;
  const target = meta?.target_value;

  // `percent` is authoritative (the backend may cap or round it differently).
  const percent =
    meta?.percent ??
    (achieved !== undefined && target ? Math.round((achieved / target) * 100) : undefined);
  const fillPercent = Math.min(Math.max(percent ?? 0, 0), 100);

  const paceStatus = meta?.pace_status as PaceStatus | undefined;
  const accent = paceStatus
    ? paceStatusColor(paceStatus, {
        primary: colors.primary,
        warning: colors.warning,
        textSecondary: colors.textSecondary,
      })
    : colors.primary;

  const daysLeft = meta?.days_left;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: accent + '20' }]}>
          <Ionicons name="flag" size={24} color={accent} />
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

      {percent !== undefined && (
        <View style={[styles.progressContainer, { borderTopColor: colors.border }]}>
          <View style={styles.progressRow}>
            {achieved !== undefined && target !== undefined ? (
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {formatMetricValue(achieved, metric, units)} /{' '}
                {formatMetricValue(target, metric, units)}
              </Text>
            ) : (
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {percent}%
              </Text>
            )}
            {paceStatus && (
              <Text style={[styles.paceStatus, { color: accent }]}>
                {t(`home.training.pace.${paceStatus}`)}
              </Text>
            )}
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[styles.progressFill, { width: `${fillPercent}%`, backgroundColor: accent }]}
            />
          </View>
          {daysLeft !== undefined && daysLeft > 0 && (
            <Text style={[styles.daysLeft, { color: colors.textSecondary }]}>
              {t('home.training.daysLeft', { count: daysLeft })}
            </Text>
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
  paceStatus: {
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
  daysLeft: {
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
});
