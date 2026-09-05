import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { useUnits } from '../../../hooks/useUnits';
import { ScreenContainer } from '../../../components';
import {
  estimateWorkoutTotals,
  makeQuickGoalPlan,
  compileWorkout,
} from '../../../services/workout/compile';
import {
  INTERVAL_PRESETS,
  buildIntervalPlan,
  defaultIntervalDraft,
  draftFromPlan,
  matchPreset,
  presetDraft,
  type IntervalDraft,
  type IntervalStepDraft,
} from '../../../services/workout/presets';
import { loadLastQuickGoal, saveLastQuickGoal } from '../../../services/workout/storage';
import type { WorkoutCuePrefs, WorkoutGoal, WorkoutPlan } from '../../../types/workout';
import { borderRadius, fontSize, msFont, spacing } from '../../../theme';
import {
  describeIntervals,
  formatGoalShort,
  formatGoalTime,
  formatStepEnd,
  segmentWeight,
} from '../../../utils/workoutFormat';

const METERS_PER_MILE = 1609.344;

/** Mockup tokens — the "ink" tile and the soft emerald icon square. */
const INK = '#0A1A14';
const PRIMARY_SOFT = '#E6F6F0';
const PRIMARY_DEEP = '#0A8C68';
const SKY = '#0EA5E9';

/** Distance presets in display units; the last two are half / full marathon. */
const DISTANCE_PRESETS: Record<
  'metric' | 'imperial',
  { value: number; key?: 'half' | 'marathon' }[]
> = {
  metric: [
    { value: 5 },
    { value: 10 },
    { value: 15 },
    { value: 21.1, key: 'half' },
    { value: 42.2, key: 'marathon' },
  ],
  imperial: [
    { value: 3.1 },
    { value: 6.2 },
    { value: 10 },
    { value: 13.1, key: 'half' },
    { value: 26.2, key: 'marathon' },
  ],
};
const TIME_PRESETS_MIN = [20, 30, 45, 60, 90];

const DISTANCE_STEP = 0.5;
const TIME_STEP_MIN = 5;
const MAX_DISTANCE_UNITS = 300;
const MAX_TIME_MIN = 24 * 60;

/** Interval step steppers. */
const STEP_TIME_S = 15;
const STEP_TIME_MIN_S = 15;
const STEP_TIME_MAX_S = 3600;
const STEP_DIST_M = 100;
const STEP_DIST_MIN_M = 100;
const STEP_DIST_MAX_M = 20_000;
const STEP_DIST_MI = 0.1;
const MAX_REPS = 30;

export type QuickGoalType = WorkoutGoal['type'];
type TypeChoice = 'open' | QuickGoalType | 'intervals';

interface Props {
  visible: boolean;
  onClose: () => void;
  plan: WorkoutPlan | null;
  onApply: (plan: WorkoutPlan) => void;
  onClear: () => void;
  cuePrefs: WorkoutCuePrefs;
  onCuePrefsChange: (partial: Partial<WorkoutCuePrefs>) => void;
  sportTypeId?: number;
  /** Preselect a goal type when opened from the idle segmented control. */
  initialType?: QuickGoalType;
  /** True while recording/paused — "Adjust goal" variant with Drop / Apply. */
  inProgress?: boolean;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * "Set a goal" sheet (mockup: Racefy v2). Goal type tiles → target card with
 * stepper and presets (or the interval presets + builder) → alerts. Open = no
 * goal.
 */
export function WorkoutConfigModal({
  visible,
  onClose,
  plan,
  onApply,
  onClear,
  cuePrefs,
  onCuePrefsChange,
  sportTypeId,
  initialType,
  inProgress,
}: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { units, formatDistance, getDistanceUnit } = useUnits();
  const isImperial = units === 'imperial';
  const unitFactor = isImperial ? METERS_PER_MILE : 1000;
  const decimal = isImperial ? '.' : ',';

  const [type, setType] = useState<TypeChoice>('distance');
  const [distanceValue, setDistanceValue] = useState(5);
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [intervals, setIntervals] = useState<IntervalDraft>(defaultIntervalDraft);

  // Seed from the current plan, else the last quick goal, else defaults.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const seed = (goal: WorkoutGoal) => {
      if (goal.type === 'distance') setDistanceValue(round1(goal.meters / unitFactor));
      else setTimeMinutes(Math.max(1, Math.round(goal.seconds / 60)));
    };
    if (plan?.mode === 'intervals') {
      setIntervals(draftFromPlan(plan) ?? defaultIntervalDraft());
      setType(initialType ?? 'intervals');
    } else if (plan?.mode === 'goal' && plan.goal) {
      seed(plan.goal);
      setType(initialType ?? plan.goal.type);
    } else {
      setType(initialType ?? 'distance');
      loadLastQuickGoal().then((last) => {
        if (!cancelled && last) seed(last);
      });
    }
    setEditing(false);
    return () => {
      cancelled = true;
    };
  }, [visible, plan, unitFactor, initialType]);

  const goal: WorkoutGoal | null = useMemo(() => {
    if (type === 'distance') {
      return { type: 'distance', meters: Math.round(distanceValue * unitFactor) };
    }
    if (type === 'time') return { type: 'time', seconds: timeMinutes * 60 };
    return null;
  }, [type, distanceValue, timeMinutes, unitFactor]);

  // The interval plan as it stands; its label doubles as the footer text.
  const intervalPlan: WorkoutPlan | null = useMemo(() => {
    if (type !== 'intervals') return null;
    const p = buildIntervalPlan(intervals, '', sportTypeId);
    p.name = describeIntervals(p, formatDistance, t);
    return p;
  }, [type, intervals, sportTypeId, formatDistance, t]);

  const goalLabel = goal ? formatGoalShort(goal, formatDistance) : (intervalPlan?.name ?? null);

  const step = (dir: 1 | -1) => {
    setEditing(false);
    if (type === 'distance') {
      setDistanceValue((v) =>
        round1(Math.min(MAX_DISTANCE_UNITS, Math.max(DISTANCE_STEP, v + dir * DISTANCE_STEP))),
      );
    } else {
      setTimeMinutes((v) => Math.min(MAX_TIME_MIN, Math.max(1, v + dir * TIME_STEP_MIN)));
    }
  };

  const startEditing = () => {
    setDraft(type === 'distance' ? String(round1(distanceValue)) : String(timeMinutes));
    setEditing(true);
  };

  const commitDraft = () => {
    const parsed = parseFloat(draft.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) {
      if (type === 'distance') setDistanceValue(round1(Math.min(MAX_DISTANCE_UNITS, parsed)));
      else setTimeMinutes(Math.min(MAX_TIME_MIN, Math.max(1, Math.round(parsed))));
    }
    setEditing(false);
  };

  /** Edit the interval form; any change un-links the preset unless it matches one again. */
  const editIntervals = (patch: Partial<IntervalDraft>) => {
    setIntervals((prev) => {
      const next = { ...prev, ...patch, presetId: null };
      return { ...next, presetId: matchPreset(next) };
    });
  };

  const apply = () => {
    if (intervalPlan) {
      onApply(intervalPlan);
      return;
    }
    if (!goal) {
      onClear();
      return;
    }
    const next = makeQuickGoalPlan(goal, sportTypeId);
    next.name = formatGoalShort(goal, formatDistance);
    void saveLastQuickGoal(goal);
    onApply(next);
  };

  // ── pieces ────────────────────────────────────────────────────────────────

  const typeTiles: {
    id: TypeChoice;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    hint: string;
  }[] = [
    {
      id: 'open',
      icon: 'walk-outline',
      label: t('recording.workout.typeOpen'),
      hint: t('recording.workout.typeOpenHint'),
    },
    {
      id: 'distance',
      icon: 'location-outline',
      label: t('recording.workout.distance'),
      hint: t('recording.workout.typeDistanceHint'),
    },
    {
      id: 'time',
      icon: 'time-outline',
      label: t('recording.workout.time'),
      hint: t('recording.workout.typeTimeHint'),
    },
    {
      id: 'intervals',
      icon: 'sparkles-outline',
      label: t('recording.workout.typeIntervals'),
      hint: t('recording.workout.typeIntervalsHint'),
    },
  ];

  const isIntervals = type === 'intervals';
  const cueRows: { key: keyof WorkoutCuePrefs; label: string; hint: string }[] = [
    {
      key: 'voice',
      label: t('recording.workout.cueVoice'),
      hint: t(
        isIntervals ? 'recording.workout.cueVoiceHintIntervals' : 'recording.workout.cueVoiceHint',
      ),
    },
    {
      key: 'tone',
      label: t('recording.workout.cueTone'),
      hint: t('recording.workout.cueToneHint'),
    },
    {
      key: 'haptics',
      label: t('recording.workout.cueHaptics'),
      hint: t('recording.workout.cueHapticsHint'),
    },
    ...(isIntervals
      ? [
          {
            key: 'countdown' as const,
            label: t('recording.workout.cueCountdown'),
            hint: t('recording.workout.cueCountdownHint'),
          },
        ]
      : [
          {
            key: 'halfway' as const,
            label: t('recording.workout.cueHalfway'),
            hint: t('recording.workout.cueHalfwayHint'),
          },
        ]),
  ];

  const valueText =
    type === 'distance'
      ? `${round1(distanceValue).toFixed(1).replace('.', decimal)} ${getDistanceUnit()}`
      : `${timeMinutes} ${t('recording.workout.minutesShort')}`;

  const presets =
    type === 'distance'
      ? DISTANCE_PRESETS[isImperial ? 'imperial' : 'metric'].map((p) => ({
          value: p.value,
          label: p.key
            ? t(
                p.key === 'half'
                  ? 'recording.workout.presetHalf'
                  : 'recording.workout.presetMarathon',
              )
            : `${String(p.value).replace('.', decimal)} ${getDistanceUnit()}`,
          active: Math.abs(distanceValue - p.value) < 0.01,
          select: () => setDistanceValue(p.value),
        }))
      : TIME_PRESETS_MIN.map((m) => ({
          value: m,
          label: formatGoalTime(m * 60),
          active: timeMinutes === m,
          select: () => setTimeMinutes(m),
        }));

  const surface = colors.cardBackground;
  const inkTile = isDark ? colors.primary + '26' : INK;
  const inkBorder = isDark ? colors.primary : INK;

  const estimate = intervalPlan ? estimateWorkoutTotals(intervalPlan, 360) : null;
  const previewSegments = intervalPlan ? compileWorkout(intervalPlan) : [];

  const stepLabel = (s: IntervalStepDraft) =>
    formatStepEnd(
      s.mode === 'time'
        ? { type: 'time', seconds: s.value }
        : { type: 'distance', meters: s.value },
      formatDistance,
      t,
    );

  const bumpStep = (s: IntervalStepDraft, dir: 1 | -1): IntervalStepDraft => {
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
  };

  const switchMode = (s: IntervalStepDraft, mode: IntervalStepDraft['mode']): IntervalStepDraft => {
    if (s.mode === mode) return s;
    // Keep the effort comparable: 60 s ≈ 200 m at the 6:00/km estimate pace.
    return mode === 'time'
      ? { mode, value: Math.max(STEP_TIME_MIN_S, Math.round(((s.value / 1000) * 360) / 15) * 15) }
      : {
          mode,
          value: Math.max(STEP_DIST_MIN_M, Math.round(((s.value / 360) * 1000) / 100) * 100),
        };
  };

  const renderSegRow = (
    title: string,
    key: 'work' | 'rest' | 'warm' | 'cool',
    value: IntervalStepDraft | null,
    optional: boolean,
  ) => {
    if (!value) {
      return (
        <TouchableOpacity
          key={key}
          style={[styles.segRow, { backgroundColor: surface, borderColor: colors.border }]}
          onPress={() => editIntervals({ [key]: { mode: 'time', value: 600 } })}
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
      <View
        key={key}
        style={[styles.segRow, { backgroundColor: surface, borderColor: colors.border }]}
      >
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
                  onPress={() => editIntervals({ [key]: switchMode(value, mode) })}
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
                onPress={() => editIntervals({ [key]: null })}
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
            onPress={() => editIntervals({ [key]: bumpStep(value, -1) })}
            accessibilityLabel="−"
          >
            <Ionicons name="remove" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.miniValue, { color: colors.textPrimary }]}>{stepLabel(value)}</Text>
          <TouchableOpacity
            style={[styles.miniButton, { borderColor: colors.border }]}
            onPress={() => editIntervals({ [key]: bumpStep(value, 1) })}
            accessibilityLabel="+"
          >
            <Ionicons name="add" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={false}
    >
      <ScreenContainer>
        {/* Header */}
        <View style={styles.header}>
          {inProgress ? (
            <>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitleLeft, { color: colors.textPrimary }]}>
                  {t('recording.workout.adjustTitle')}
                </Text>
                <Text style={[styles.headerSub, { color: colors.textMuted }]}>
                  {t('recording.workout.adjustSubtitle')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.iconButton, { borderColor: colors.border }]}
                accessibilityLabel={t('common.close')}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.iconButton, { borderColor: colors.border }]}
                accessibilityLabel={t('common.close')}
              >
                <Ionicons name="chevron-down" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {t('recording.workout.title')}
              </Text>
              <TouchableOpacity
                onPress={onClear}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={!plan}
              >
                <Text
                  style={[
                    styles.clearText,
                    { color: plan ? colors.textSecondary : colors.textMuted },
                  ]}
                >
                  {t('recording.workout.clear')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!inProgress && (
            <View>
              <Text style={[styles.headline, { color: colors.textPrimary }]}>
                {t('recording.workout.headline')}
              </Text>
              <Text style={[styles.headlineHint, { color: colors.textSecondary }]}>
                {t('recording.workout.headlineHint')}
              </Text>
            </View>
          )}

          {/* Goal type */}
          <View>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {t('recording.workout.goalType').toUpperCase()}
            </Text>
            <View style={styles.typeGrid}>
              {typeTiles.map((tile) => {
                const active = type === tile.id;
                return (
                  <TouchableOpacity
                    key={tile.id}
                    style={[
                      styles.typeTile,
                      {
                        backgroundColor: active ? inkTile : surface,
                        borderColor: active ? inkBorder : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setEditing(false);
                      setType(tile.id);
                    }}
                    activeOpacity={0.85}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <View
                      style={[
                        styles.typeIcon,
                        { backgroundColor: active ? colors.primary : PRIMARY_SOFT },
                      ]}
                    >
                      <Ionicons
                        name={tile.icon}
                        size={17}
                        color={active ? '#ffffff' : PRIMARY_DEEP}
                      />
                    </View>
                    <Text
                      style={[styles.typeLabel, { color: active ? '#ffffff' : colors.textPrimary }]}
                    >
                      {tile.label}
                    </Text>
                    <Text
                      style={[
                        styles.typeHint,
                        { color: active ? 'rgba(255,255,255,0.6)' : colors.textMuted },
                      ]}
                      numberOfLines={2}
                    >
                      {tile.hint}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Target (distance / time) */}
          {goal && (
            <View>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                {t(
                  type === 'distance'
                    ? 'recording.workout.targetDistance'
                    : 'recording.workout.targetDuration',
                ).toUpperCase()}
              </Text>
              <View style={[styles.card, { backgroundColor: surface, borderColor: colors.border }]}>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={[
                      styles.stepButton,
                      { borderColor: colors.border, backgroundColor: surface },
                    ]}
                    onPress={() => step(-1)}
                    accessibilityLabel="−"
                  >
                    <Ionicons name="remove" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.valueBox}
                    onPress={startEditing}
                    activeOpacity={0.7}
                  >
                    {editing ? (
                      <TextInput
                        value={draft}
                        onChangeText={setDraft}
                        onBlur={commitDraft}
                        onSubmitEditing={commitDraft}
                        keyboardType="decimal-pad"
                        autoFocus
                        selectTextOnFocus
                        style={[
                          styles.valueInput,
                          { color: colors.textPrimary, borderColor: colors.primary },
                        ]}
                      />
                    ) : (
                      <Text style={[styles.valueText, { color: colors.textPrimary }]}>
                        {valueText}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.stepButton,
                      { borderColor: colors.border, backgroundColor: surface },
                    ]}
                    onPress={() => step(1)}
                    accessibilityLabel="+"
                  >
                    <Ionicons name="add" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.chips}>
                  {presets.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: p.active ? inkTile : surface,
                          borderColor: p.active ? inkBorder : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setEditing(false);
                        p.select();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: p.active ? '#ffffff' : colors.textPrimary },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Intervals: presets */}
          {isIntervals && (
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
                      onPress={() => setIntervals(presetDraft(preset))}
                      activeOpacity={0.85}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      <View style={[styles.typeIcon, { backgroundColor: PRIMARY_SOFT }]}>
                        <Ionicons name="sparkles-outline" size={16} color={PRIMARY_DEEP} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.presetName, { color: colors.textPrimary }]}>
                          {name}
                        </Text>
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
          )}

          {/* Intervals: build your own */}
          {isIntervals && (
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
                <View
                  style={[styles.segRow, { backgroundColor: surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.segTitle, { flex: 1, color: colors.textPrimary }]}>
                    {t('recording.workout.repeats')}
                  </Text>
                  <View style={styles.miniStepper}>
                    <TouchableOpacity
                      style={[styles.miniButton, { borderColor: colors.border }]}
                      onPress={() => editIntervals({ reps: Math.max(1, intervals.reps - 1) })}
                      accessibilityLabel="−"
                    >
                      <Ionicons name="remove" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.repsValue, { color: colors.textPrimary }]}>
                      {intervals.reps}×
                    </Text>
                    <TouchableOpacity
                      style={[styles.miniButton, { borderColor: colors.border }]}
                      onPress={() =>
                        editIntervals({ reps: Math.min(MAX_REPS, intervals.reps + 1) })
                      }
                      accessibilityLabel="+"
                    >
                      <Ionicons name="add" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
                {renderSegRow(t('recording.workout.stepWork'), 'work', intervals.work, false)}
                {renderSegRow(t('recording.workout.stepRecovery'), 'rest', intervals.rest, false)}
                {renderSegRow(t('recording.workout.stepWarmup'), 'warm', intervals.warm, true)}
                {renderSegRow(t('recording.workout.stepCooldown'), 'cool', intervals.cool, true)}
              </View>
            </View>
          )}

          {/* Intervals: plan strip preview */}
          {isIntervals && previewSegments.length > 0 && (
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
                            : SKY + '55',
                    }}
                  />
                ))}
              </View>
              <View style={styles.legend}>
                {(
                  [
                    ['legendWork', colors.primary],
                    ['legendRecovery', colors.warning + '66'],
                    ['legendWarmCool', SKY + '55'],
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

          {/* Alerts */}
          {(goal || intervalPlan) && (
            <View>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                {t('recording.workout.alerts').toUpperCase()}
              </Text>
              <View
                style={[
                  styles.card,
                  styles.alertsCard,
                  { backgroundColor: surface, borderColor: colors.border },
                ]}
              >
                {cueRows.map((row, i) => (
                  <View
                    key={row.key}
                    style={[
                      styles.alertRow,
                      i > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.alertLabel, { color: colors.textPrimary }]}>
                        {row.label}
                      </Text>
                      <Text style={[styles.alertHint, { color: colors.textMuted }]}>
                        {row.hint}
                      </Text>
                    </View>
                    <Switch
                      value={cuePrefs[row.key]}
                      onValueChange={(v) => onCuePrefsChange({ [row.key]: v })}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#ffffff"
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          {inProgress && (goal || intervalPlan) && (
            <View style={[styles.liveNote, { backgroundColor: colors.aiLight }]}>
              <View style={[styles.liveNoteIcon, { backgroundColor: colors.ai }]}>
                <Ionicons name="sparkles" size={13} color="#ffffff" />
              </View>
              <Text style={[styles.liveNoteText, { color: colors.textPrimary }]}>
                {t(
                  isIntervals
                    ? 'recording.workout.liveNoteIntervals'
                    : 'recording.workout.liveNote',
                )}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            { borderTopColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          {inProgress ? (
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                ]}
                onPress={onClear}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
                  {t('recording.workout.dropGoal')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary, flex: 1.5 }]}
                onPress={apply}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryText}>{t('recording.workout.applyNow')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={apply}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryText} numberOfLines={1}>
                {goalLabel
                  ? t('recording.workout.saveGoal', { goal: goalLabel })
                  : t('recording.workout.typeOpen')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScreenContainer>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  headerTitleLeft: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  clearText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  headline: {
    fontSize: msFont(22),
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: msFont(27),
  },
  headlineHint: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  estimate: {
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeTile: {
    width: '48.5%',
    flexGrow: 1,
    padding: spacing.md - 2,
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.sm,
  },
  typeIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  typeHint: {
    fontSize: fontSize.xs,
    lineHeight: 15,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueBox: {
    flex: 1,
    alignItems: 'center',
  },
  valueText: {
    fontSize: msFont(30),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  valueInput: {
    fontSize: msFont(30),
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 140,
    borderBottomWidth: 2,
    paddingVertical: 0,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
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
  presetName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  presetSub: {
    fontSize: fontSize.xs,
    marginTop: 1,
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
  segAdd: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  modeChip: {
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  modeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  miniStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  miniButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniValue: {
    minWidth: 64,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  repsValue: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: msFont(22),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  planStrip: {
    flexDirection: 'row',
    gap: 2,
    height: 34,
    borderRadius: 10,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: fontSize.xs,
  },
  alertsCard: {
    paddingVertical: 0,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
  },
  alertLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  alertHint: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  liveNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md - 2,
    borderRadius: 14,
    alignItems: 'flex-start',
  },
  liveNoteIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveNoteText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryText: {
    color: '#ffffff',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
