import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import type { SegmentProgress, WorkoutEngineState } from '../../../services/workout/engine';
import type { CompiledSegment, WorkoutPlan } from '../../../types/workout';
import { fontSize, msFont, spacing } from '../../../theme';
import {
  formatGoalTime,
  formatPlanLabel,
  formatRemainingShort,
  formatStepEnd,
  segmentTitle,
  segmentWeight,
} from '../../../utils/workoutFormat';

type Variant =
  /** On the recording map overlay — light frosted card, dark text (matches RecordingView's metric cards). */
  | 'recording'
  /** Paused screen — themed card. */
  | 'paused';

interface Props {
  plan: WorkoutPlan | null;
  progress: SegmentProgress | null;
  /** Needed for interval sessions (next segment, plan strip). */
  state?: WorkoutEngineState | null;
  variant: Variant;
  formatDistance: (meters: number) => string;
  /** Tap → open the configurator (change the goal mid-run). */
  onPress?: () => void;
  /** Intervals: end the current segment now. */
  onSkip?: () => void;
}

/** Warm-up / cool-down colour from the mockup (work = primary, recovery = amber). */
const SKY = '#0EA5E9';

/**
 * The goal HUD (mockup: GoalHUD). Simple goal: "● GOAL · 5 KM · Edit", the
 * remaining figure, "5.0 km goal · left", a bar. Intervals: the current
 * segment, its remaining time/distance, "Next · Rep 1 / 400 m", a segment bar
 * and the plan strip with the athlete's position. Without a plan it is the
 * dashed "Set a goal mid-run" row.
 */
export function WorkoutProgressCard({
  plan,
  progress,
  state,
  variant,
  formatDistance,
  onPress,
  onSkip,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const light = variant === 'recording';

  const ink = light ? '#0A1A14' : colors.textPrimary;
  const muted = light ? '#5E6B65' : colors.textMuted;
  const trackBg = light ? 'rgba(10,26,20,0.1)' : colors.border;

  // Pulse the big number through the last three seconds of a timed segment.
  const pulse = useRef(new Animated.Value(1)).current;
  const secondsLeft =
    progress?.remaining?.type === 'time' && !progress.overshoot
      ? Math.ceil(progress.remaining.seconds)
      : null;
  const pulsing =
    plan?.mode === 'intervals' && secondsLeft !== null && secondsLeft <= 3 && secondsLeft > 0;
  useEffect(() => {
    if (!pulsing) {
      pulse.setValue(1);
      return;
    }
    pulse.setValue(1.12);
    Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [pulsing, secondsLeft, pulse]);

  if (!plan) {
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
          <Ionicons name="flag-outline" size={14} color={ink} />
        </View>
        <Text style={[styles.emptyText, { color: ink }]}>{t('recording.workout.setMidRun')}</Text>
        <Text style={[styles.emptyAdd, { color: muted }]}>{t('recording.workout.add')}</Text>
      </TouchableOpacity>
    );
  }

  const Container = onPress ? TouchableOpacity : View;

  // ── intervals ─────────────────────────────────────────────────────────────
  if (plan.mode === 'intervals') {
    const segments = state?.segments ?? [];
    const current: CompiledSegment | null = progress?.segment ?? segments[0] ?? null;
    const done = progress?.overshoot != null;
    const next = current && !done ? segments[current.index + 1] : undefined;
    const segColor = !current
      ? colors.primary
      : current.kind === 'work'
        ? colors.primary
        : current.kind === 'recovery'
          ? colors.warning
          : SKY;
    const fraction = done ? 1 : (progress?.fraction ?? 0);
    const cardBg = done
      ? colors.primary + (light ? '2E' : '22')
      : light
        ? 'rgba(255,255,255,0.78)'
        : colors.cardBackground;
    const border = done ? colors.primary : light ? 'rgba(10,26,20,0.08)' : colors.border;

    const header = done
      ? t('recording.workout.planComplete')
      : current
        ? segmentTitle(current, t)
        : plan.name;
    const big = done
      ? '✓'
      : progress?.remaining
        ? formatRemainingShort(progress.remaining, formatDistance)
        : t('recording.workout.stepOpen');
    const sub = done
      ? t('recording.workout.allSegmentsDone')
      : current
        ? t('recording.workout.segmentLeft', {
            length: formatStepEnd(current.end, formatDistance, t),
          })
        : '';
    const canSkip = !!onSkip && !done && !!current;

    return (
      <Container
        style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${header}. ${big}. ${sub}`}
      >
        <View style={styles.headerRow}>
          <View style={[styles.dot, { backgroundColor: done ? colors.primary : segColor }]} />
          <Text
            style={[styles.headerText, { color: done ? colors.primary : muted }]}
            numberOfLines={1}
          >
            {header.toUpperCase()}
          </Text>
          {canSkip && (
            <TouchableOpacity
              onPress={onSkip}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={t('recording.workout.skipSegment')}
            >
              <Text style={[styles.edit, { color: ink }]}>{t('recording.workout.skip')} ▸</Text>
            </TouchableOpacity>
          )}
          {onPress && (
            <Text style={[styles.edit, { color: muted }]}>{t('recording.workout.edit')}</Text>
          )}
        </View>

        <View style={styles.bigRow}>
          <View style={{ flex: 1 }}>
            <Animated.Text
              style={[styles.big, { color: ink, transform: [{ scale: pulse }] }]}
              numberOfLines={1}
            >
              {big}
            </Animated.Text>
            <Text style={[styles.sub, { color: muted }]} numberOfLines={1}>
              {sub}
            </Text>
          </View>
          {!done && (
            <View style={styles.nextBlock}>
              <Text style={[styles.nextTitle, { color: ink }]} numberOfLines={1}>
                {next
                  ? t('recording.workout.next', { segment: segmentTitle(next, t) })
                  : t('recording.workout.lastSegment')}
              </Text>
              <Text style={[styles.nextSub, { color: muted }]} numberOfLines={1}>
                {next
                  ? formatStepEnd(next.end, formatDistance, t)
                  : t('recording.workout.repsTotal', { count: repeatCount(plan) })}
              </Text>
            </View>
          )}
          {done && <Ionicons name="checkmark-circle" size={26} color={colors.primary} />}
        </View>

        {/* Current segment bar */}
        <View style={[styles.track, { backgroundColor: trackBg }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: segColor, width: `${Math.round(fraction * 100)}%` },
            ]}
          />
        </View>

        {/* Plan strip with position */}
        {segments.length > 1 && (
          <View style={styles.strip}>
            {segments.map((s) => {
              const isDone = done || (current ? s.index < current.index : false);
              const isCurrent = !done && current?.index === s.index;
              const base =
                s.kind === 'work' ? colors.primary : s.kind === 'recovery' ? colors.warning : SKY;
              return (
                <View
                  key={s.index}
                  style={[
                    styles.stripSeg,
                    {
                      flexGrow: Math.max(0.6, segmentWeight(s) / 60),
                      backgroundColor: isDone || isCurrent ? base : base + '40',
                      opacity: isDone ? 0.85 : 1,
                    },
                  ]}
                />
              );
            })}
          </View>
        )}
      </Container>
    );
  }

  // ── simple goal ───────────────────────────────────────────────────────────
  const goal = plan.goal;
  if (!goal) return null;
  const reached = progress?.overshoot != null;
  const fraction = progress?.fraction ?? 0;
  const label = formatPlanLabel(plan, formatDistance, t);
  const cardBg = reached
    ? colors.primary + (light ? '2E' : '22')
    : light
      ? 'rgba(255,255,255,0.78)'
      : colors.cardBackground;
  const border = reached ? colors.primary : light ? 'rgba(10,26,20,0.08)' : colors.border;

  let big: string;
  let sub: string;
  if (reached && progress?.overshoot) {
    const extra =
      goal.type === 'time'
        ? formatGoalTime(progress.overshoot.activeSeconds)
        : formatDistance(progress.overshoot.distanceM);
    big = `+${extra}`;
    const at =
      goal.type === 'time'
        ? formatDistance(progress.elapsed.distanceM - progress.overshoot.distanceM)
        : formatGoalTime(progress.elapsed.activeSeconds - progress.overshoot.activeSeconds);
    sub = t('recording.workout.reachedDetail', { extra, at });
  } else if (progress?.remaining) {
    big = formatRemainingShort(progress.remaining, formatDistance);
    sub = t('recording.workout.goalLeft', { goal: label });
  } else {
    big = label;
    sub = t('recording.workout.goalLeft', { goal: label });
  }

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

function repeatCount(plan: WorkoutPlan): number {
  const repeat = plan.blocks?.find((b) => 'times' in b);
  return repeat && 'times' in repeat ? repeat.times : 0;
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
    marginLeft: spacing.sm,
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
  nextBlock: {
    alignItems: 'flex-end',
    maxWidth: '45%',
  },
  nextTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  nextSub: {
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
  strip: {
    flexDirection: 'row',
    gap: 2,
    height: 8,
  },
  stripSeg: {
    minWidth: 2,
    borderRadius: 2,
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
