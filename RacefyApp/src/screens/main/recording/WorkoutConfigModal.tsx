import React from 'react';

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
import { makeQuickGoalPlan } from '../../../services/workout/compile';
import { saveLastQuickGoal } from '../../../services/workout/storage';
import type { WorkoutCuePrefs, GuidedWorkout } from '../../../types/workout';
import { borderRadius, fontSize, heroColors, msFont, spacing } from '../../../theme';
import { IntervalEditor } from './IntervalEditor';
import {
  round1,
  useWorkoutConfigDraft,
  type QuickGoalType,
  type TypeChoice,
} from './useWorkoutConfigDraft';
import { formatGoalShort, formatGoalTime } from '../../../utils/workoutFormat';

/** Mockup tokens — the soft emerald icon square. */
const PRIMARY_SOFT = '#E6F6F0';
const PRIMARY_DEEP = '#0A8C68';

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

export type { QuickGoalType };

interface Props {
  visible: boolean;
  onClose: () => void;
  plan: GuidedWorkout | null;
  onApply: (plan: GuidedWorkout) => void;
  onClear: () => void;
  cuePrefs: WorkoutCuePrefs;
  onCuePrefsChange: (partial: Partial<WorkoutCuePrefs>) => void;
  sportTypeId?: number;
  /** Preselect a goal type when opened from the idle segmented control. */
  initialType?: QuickGoalType;
  /** True while recording/paused — "Adjust goal" variant with Drop / Apply. */
  inProgress?: boolean;
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
  const decimal = isImperial ? '.' : ',';

  const {
    type,
    setType,
    distanceValue,
    setDistanceValue,
    timeMinutes,
    setTimeMinutes,
    editing,
    setEditing,
    draft,
    setDraft,
    intervals,
    setIntervals,
    goal,
    intervalPlan,
    goalLabel,
    step,
    startEditing,
    commitDraft,
    editIntervals,
  } = useWorkoutConfigDraft({ visible, plan, sportTypeId, initialType });

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
  const inkTile = isDark ? colors.primary + '26' : heroColors.bg;
  const inkBorder = isDark ? colors.primary : heroColors.bg;

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

          {isIntervals && (
            <IntervalEditor
              intervals={intervals}
              intervalPlan={intervalPlan}
              isImperial={isImperial}
              onSelectPreset={setIntervals}
              onEdit={editIntervals}
            />
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
