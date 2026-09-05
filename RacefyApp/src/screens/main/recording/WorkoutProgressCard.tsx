import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import type { SegmentProgress } from '../../../services/workout/engine';
import type { WorkoutPlan } from '../../../types/workout';
import { fontSize, msFont, spacing } from '../../../theme';
import {
  formatGoalTime,
  formatPlanLabel,
  formatRemainingShort,
} from '../../../utils/workoutFormat';

type Variant =
  /** On the recording map overlay — light frosted card, dark text (matches RecordingView's metric cards). */
  | 'recording'
  /** Paused screen — themed card. */
  | 'paused';

interface Props {
  plan: WorkoutPlan | null;
  progress: SegmentProgress | null;
  variant: Variant;
  formatDistance: (meters: number) => string;
  /** Tap → open the configurator (change the goal mid-run). */
  onPress?: () => void;
}

/**
 * The goal HUD (mockup: GoalHUD). Header "● GOAL · 5 KM · Edit", a big
 * remaining figure with "5.0 km goal · left" under it, a progress bar; after
 * the goal a green "reached" state with the overshoot. Without a plan it is
 * the dashed "Set a goal mid-run" row.
 */
export function WorkoutProgressCard({ plan, progress, variant, formatDistance, onPress }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const light = variant === 'recording';

  if (!plan?.goal) {
    if (!onPress) return null;
    return (
      <TouchableOpacity
        style={[
          styles.emptyRow,
          {
            borderColor: light ? 'rgba(10,26,20,0.22)' : colors.border,
            backgroundColor: light ? 'rgba(255,255,255,0.5)' : colors.cardBackground,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityLabel={t('recording.workout.setMidRun')}
      >
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: light ? 'rgba(10,26,20,0.08)' : colors.background },
          ]}
        >
          <Ionicons name="flag-outline" size={14} color={light ? '#0A1A14' : colors.textPrimary} />
        </View>
        <Text style={[styles.emptyText, { color: light ? '#0A1A14' : colors.textPrimary }]}>
          {t('recording.workout.setMidRun')}
        </Text>
        <Text style={[styles.emptyAdd, { color: light ? '#5E6B65' : colors.textMuted }]}>
          {t('recording.workout.add')}
        </Text>
      </TouchableOpacity>
    );
  }

  const goal = plan.goal;
  const reached = progress?.overshoot != null;
  const fraction = progress?.fraction ?? 0;
  const label = formatPlanLabel(plan, formatDistance);

  const ink = light ? '#0A1A14' : colors.textPrimary;
  const muted = light ? '#5E6B65' : colors.textMuted;
  const cardBg = reached
    ? colors.primary + (light ? '2E' : '22')
    : light
      ? 'rgba(255,255,255,0.78)'
      : colors.cardBackground;
  const border = reached ? colors.primary : light ? 'rgba(10,26,20,0.08)' : colors.border;
  const trackBg = light ? 'rgba(10,26,20,0.1)' : colors.border;

  let big: string;
  let sub: string;
  if (reached && progress?.overshoot) {
    big =
      goal.type === 'time'
        ? `+${formatGoalTime(progress.overshoot.activeSeconds)}`
        : `+${formatDistance(progress.overshoot.distanceM)}`;
    const at =
      goal.type === 'time'
        ? formatDistance(progress.elapsed.distanceM - progress.overshoot.distanceM)
        : formatGoalTime(progress.elapsed.activeSeconds - progress.overshoot.activeSeconds);
    sub = t('recording.workout.reachedDetail', { extra: big.slice(1), at });
  } else if (progress?.remaining) {
    big = formatRemainingShort(progress.remaining, formatDistance);
    sub = t('recording.workout.goalLeft', { goal: label });
  } else {
    big = label;
    sub = t('recording.workout.goalLeft', { goal: label });
  }

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${t('recording.workout.goalLabel', { goal: label })}. ${sub}`}
    >
      <View style={styles.headerRow}>
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        <Text
          style={[styles.headerText, { color: reached ? colors.primary : muted }]}
          numberOfLines={1}
        >
          {(reached
            ? t('recording.workout.reached')
            : t('recording.workout.goalLabel', { goal: label })
          ).toUpperCase()}
        </Text>
        {onPress && (
          <Text style={[styles.edit, { color: muted }]}>{t('recording.workout.edit')}</Text>
        )}
      </View>

      <View style={styles.bigRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.big, { color: ink }]} numberOfLines={1}>
            {big}
          </Text>
          <Text style={[styles.sub, { color: muted }]} numberOfLines={1}>
            {sub}
          </Text>
        </View>
        {!reached && (
          <Text style={[styles.percent, { color: muted }]}>{Math.round(fraction * 100)}%</Text>
        )}
        {reached && <Ionicons name="checkmark-circle" size={26} color={colors.primary} />}
      </View>

      <View style={[styles.track, { backgroundColor: trackBg }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: colors.primary, width: `${Math.round(fraction * 100)}%` },
          ]}
        />
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerText: {
    flex: 1,
    fontSize: msFont(10),
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  edit: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  bigRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  big: {
    fontSize: msFont(32),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
    lineHeight: msFont(36),
  },
  sub: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  percent: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    paddingBottom: 2,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignSelf: 'stretch',
  },
  emptyIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  emptyAdd: {
    fontSize: fontSize.xs,
  },
});
