import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { useUnits } from '../../../hooks/useUnits';
import { compileWorkout, estimateWorkoutTotals } from '../../../services/workout/compile';
import {
  INTERVAL_PRESETS,
  buildIntervalPlan,
  presetDraft,
  type IntervalDraft,
  type IntervalStepDraft,
} from '../../../services/workout/presets';
import type { GuidedWorkout } from '../../../types/workout';
import { borderRadius, fontSize, heroColors, msFont, spacing } from '../../../theme';
import { describeIntervals, formatStepEnd, segmentWeight } from '../../../utils/workoutFormat';
import { METERS_PER_MILE } from './useWorkoutConfigDraft';

/** Mockup tokens — the soft emerald icon square. */
const PRIMARY_SOFT = '#E6F6F0';
const PRIMARY_DEEP = '#0A8C68';

/** Interval step steppers. */
const STEP_TIME_S = 15;
const STEP_TIME_MIN_S = 15;
const STEP_TIME_MAX_S = 3600;
const STEP_DIST_M = 100;
const STEP_DIST_MIN_M = 100;
const STEP_DIST_MAX_M = 20_000;
const STEP_DIST_MI = 0.1;
const MAX_REPS = 30;

type SegKey = 'work' | 'rest' | 'warm' | 'cool';

function bumpStep(s: IntervalStepDraft, dir: 1 | -1, isImperial: boolean): IntervalStepDraft {
  if (s.mode === 'time') {
    return {
      ...s,
      value: Math.min(STEP_TIME_MAX_S, Math.max(STEP_TIME_MIN_S, s.value + dir * STEP_TIME_S)),
    };
  }
  const inc = isImperial ? STEP_DIST_MI * METERS_PER_MILE : STEP_DIST_M;
  const min = isImperial ? STEP_DIST_MI * METERS_PER_MILE : STEP_DIST_MIN_M;
  return {
    ...s,
    value: Math.round(Math.min(STEP_DIST_MAX_M, Math.max(min, s.value + dir * inc))),
  };
}

function switchMode(s: IntervalStepDraft, mode: IntervalStepDraft['mode']): IntervalStepDraft {
  if (s.mode === mode) return s;
  // Keep the effort comparable: 60 s ≈ 200 m at the 6:00/km estimate pace.
  return mode === 'time'
    ? { mode, value: Math.max(STEP_TIME_MIN_S, Math.round(((s.value / 1000) * 360) / 15) * 15) }
    : {
        mode,
        value: Math.max(STEP_DIST_MIN_M, Math.round(((s.value / 360) * 1000) / 100) * 100),
      };
}

/** Dark "ink" chip in light theme, an emerald tint in dark. */
function useInk() {
  const { colors, isDark } = useTheme();
  return {
    inkTile: isDark ? colors.primary + '26' : heroColors.bg,
    inkBorder: isDark ? colors.primary : heroColors.bg,
  };
}

/** One step of the interval builder: time/distance, stepper, remove (optional ones). */
const IntervalSegmentRow = React.memo(function IntervalSegmentRow({
  title,
  segKey,
  value,
  optional,
  isImperial,
  onEdit,
}: {
  title: string;
  segKey: SegKey;
  value: IntervalStepDraft | null;
  optional: boolean;
  isImperial: boolean;
  onEdit: (patch: Partial<IntervalDraft>) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistance } = useUnits();
  const { inkTile, inkBorder } = useInk();
  const surface = colors.cardBackground;
  if (!value) {
    return (
      <TouchableOpacity
        style={[styles.segRow, { backgroundColor: surface, borderColor: colors.border }]}
        onPress={() => onEdit({ [segKey]: { mode: 'time', value: 600 } })}
        activeOpacity={0.8}
      >
        <Text style={[styles.segTitle, { color: colors.textMuted }]}>{title}</Text>
        <Text style={[styles.segAdd, { color: PRIMARY_DEEP }]}>
          + {t('recording.workout.stepAdd')}
        </Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={[styles.segRow, { backgroundColor: surface, borderColor: colors.border }]}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[styles.segTitle, { color: colors.textPrimary }]}>{title}</Text>
        <View style={styles.modeRow}>
          {(['time', 'distance'] as const).map((mode) => {
            const active = value.mode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeChip,
                  {
                    backgroundColor: active ? inkTile : 'transparent',
                    borderColor: active ? inkBorder : colors.border,
                  },
                ]}
                onPress={() => onEdit({ [segKey]: switchMode(value, mode) })}
              >
                <Text
                  style={[styles.modeText, { color: active ? '#ffffff' : colors.textSecondary }]}
                >
                  {t(
                    mode === 'time'
                      ? 'recording.workout.modeTime'
                      : 'recording.workout.modeDistance',
                  )}
                </Text>
              </TouchableOpacity>
            );
          })}
          {optional && (
            <TouchableOpacity
              onPress={() => onEdit({ [segKey]: null })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.modeText, { color: colors.error }]}>
                {t('recording.workout.stepRemove')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.miniStepper}>
        <TouchableOpacity
          style={[styles.miniButton, { borderColor: colors.border }]}
          onPress={() => onEdit({ [segKey]: bumpStep(value, -1, isImperial) })}
          accessibilityLabel="−"
        >
          <Ionicons name="remove" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.miniValue, { color: colors.textPrimary }]}>
          {formatStepEnd(
            value.mode === 'time'
              ? { type: 'time', seconds: value.value }
              : { type: 'distance', meters: value.value },
            formatDistance,
            t,
          )}
        </Text>
        <TouchableOpacity
          style={[styles.miniButton, { borderColor: colors.border }]}
          onPress={() => onEdit({ [segKey]: bumpStep(value, 1, isImperial) })}
          accessibilityLabel="+"
        >
          <Ionicons name="add" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

interface Props {
  intervals: IntervalDraft;
  intervalPlan: GuidedWorkout | null;
  isImperial: boolean;
  onSelectPreset: (draft: IntervalDraft) => void;
  onEdit: (patch: Partial<IntervalDraft>) => void;
}

/**
 * The interval part of the goal sheet: presets, "build your own" (repeats and
 * four steps) and the plan strip preview.
 */
export function IntervalEditor({
  intervals,
  intervalPlan,
  isImperial,
  onSelectPreset,
  onEdit,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistance } = useUnits();
  const surface = colors.cardBackground;
  const estimate = intervalPlan ? estimateWorkoutTotals(intervalPlan, 360) : null;
  const previewSegments = intervalPlan ? compileWorkout(intervalPlan) : [];

  return (
    <>
      {/* Intervals: presets */}
      <View>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {t('recording.workout.presets').toUpperCase()}
        </Text>
        <View style={{ gap: spacing.sm }}>
          {INTERVAL_PRESETS.map((preset) => {
            const active = intervals.presetId === preset.id;
            const p = buildIntervalPlan(presetDraft(preset), '');
            const name = describeIntervals(p, formatDistance, t);
            return (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetRow,
                  {
                    backgroundColor: surface,
                    borderColor: active ? colors.primary : colors.border,
                    shadowColor: colors.primary,
                    shadowOpacity: active ? 0.25 : 0,
                  },
                ]}
                onPress={() => onSelectPreset(presetDraft(preset))}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <View style={[styles.typeIcon, { backgroundColor: PRIMARY_SOFT }]}>
                  <Ionicons name="sparkles-outline" size={16} color={PRIMARY_DEEP} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.presetName, { color: colors.textPrimary }]}>{name}</Text>
                  <Text style={[styles.presetSub, { color: colors.textMuted }]}>
                    {t(`recording.workout.presetSub.${preset.id}`)}
                  </Text>
                </View>
                {active && <Ionicons name="checkmark" size={18} color={colors.textPrimary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Intervals: build your own */}
      <View>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            {t('recording.workout.buildYourOwn').toUpperCase()}
          </Text>
          {estimate && (
            <Text style={[styles.estimate, { color: colors.textMuted }]}>
              {t('recording.workout.estimated', {
                time: `${Math.round(estimate.seconds / 60)} ${t('recording.workout.minutesShort')}`,
              })}
            </Text>
          )}
        </View>
        <View style={{ gap: spacing.sm }}>
          <View style={[styles.segRow, { backgroundColor: surface, borderColor: colors.border }]}>
            <Text style={[styles.segTitle, { flex: 1, color: colors.textPrimary }]}>
              {t('recording.workout.repeats')}
            </Text>
            <View style={styles.miniStepper}>
              <TouchableOpacity
                style={[styles.miniButton, { borderColor: colors.border }]}
                onPress={() => onEdit({ reps: Math.max(1, intervals.reps - 1) })}
                accessibilityLabel="−"
              >
                <Ionicons name="remove" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.repsValue, { color: colors.textPrimary }]}>
                {intervals.reps}×
              </Text>
              <TouchableOpacity
                style={[styles.miniButton, { borderColor: colors.border }]}
                onPress={() => onEdit({ reps: Math.min(MAX_REPS, intervals.reps + 1) })}
                accessibilityLabel="+"
              >
                <Ionicons name="add" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          <IntervalSegmentRow
            title={t('recording.workout.stepWork')}
            segKey="work"
            value={intervals.work}
            optional={false}
            isImperial={isImperial}
            onEdit={onEdit}
          />
          <IntervalSegmentRow
            title={t('recording.workout.stepRecovery')}
            segKey="rest"
            value={intervals.rest}
            optional={false}
            isImperial={isImperial}
            onEdit={onEdit}
          />
          <IntervalSegmentRow
            title={t('recording.workout.stepWarmup')}
            segKey="warm"
            value={intervals.warm}
            optional={true}
            isImperial={isImperial}
            onEdit={onEdit}
          />
          <IntervalSegmentRow
            title={t('recording.workout.stepCooldown')}
            segKey="cool"
            value={intervals.cool}
            optional={true}
            isImperial={isImperial}
            onEdit={onEdit}
          />
        </View>
      </View>

      {/* Intervals: plan strip preview */}
      {previewSegments.length > 0 && (
        <View>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            {t('recording.workout.plan').toUpperCase()}
          </Text>
          <View style={[styles.planStrip, { backgroundColor: colors.background }]}>
            {previewSegments.map((s) => (
              <View
                key={s.index}
                style={{
                  flexGrow: Math.max(0.6, segmentWeight(s) / 60),
                  minWidth: 3,
                  backgroundColor:
                    s.kind === 'work'
                      ? colors.primary
                      : s.kind === 'recovery'
                        ? colors.warning + '66'
                        : heroColors.sky + '55',
                }}
              />
            ))}
          </View>
          <View style={styles.legend}>
            {(
              [
                ['legendWork', colors.primary],
                ['legendRecovery', colors.warning + '66'],
                ['legendWarmCool', heroColors.sky + '55'],
              ] as const
            ).map(([key, color]) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={[styles.legendText, { color: colors.textMuted }]}>
                  {t(`recording.workout.${key}`)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  estimate: {
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendText: {
    fontSize: fontSize.xs,
  },
  miniButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  miniValue: {
    minWidth: 64,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  modeChip: {
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  modeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  planStrip: {
    flexDirection: 'row',
    gap: 2,
    height: 34,
    borderRadius: 10,
    overflow: 'hidden',
  },
  presetName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.md - 2,
    borderRadius: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
  },
  presetSub: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  repsValue: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: msFont(22),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  segAdd: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  segRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md - 2,
    borderRadius: 14,
    borderWidth: 1,
  },
  segTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  typeIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
