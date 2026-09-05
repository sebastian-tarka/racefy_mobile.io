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
import { makeQuickGoalPlan } from '../../../services/workout/compile';
import { loadLastQuickGoal, saveLastQuickGoal } from '../../../services/workout/storage';
import type { WorkoutCuePrefs, WorkoutGoal, WorkoutPlan } from '../../../types/workout';
import { borderRadius, fontSize, msFont, spacing } from '../../../theme';
import { formatGoalShort, formatGoalTime } from '../../../utils/workoutFormat';

const METERS_PER_MILE = 1609.344;

/** Mockup tokens — the "ink" tile and the soft emerald icon square. */
const INK = '#0A1A14';
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

const DISTANCE_STEP = 0.5;
const TIME_STEP_MIN = 5;
const MAX_DISTANCE_UNITS = 300;
const MAX_TIME_MIN = 24 * 60;

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
 * stepper and presets → alerts. Open = no goal. Intervals is shown but not
 * yet available (next phase).
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

  // Seed from the current plan, else the last quick goal, else defaults.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const seed = (goal: WorkoutGoal) => {
      if (goal.type === 'distance') setDistanceValue(round1(goal.meters / unitFactor));
      else setTimeMinutes(Math.max(1, Math.round(goal.seconds / 60)));
    };
    if (plan?.mode === 'goal' && plan.goal) {
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

  const goalLabel = goal ? formatGoalShort(goal, formatDistance) : null;

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

  const apply = () => {
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
    disabled?: boolean;
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
      disabled: true,
    },
  ];

  const cueRows: { key: keyof WorkoutCuePrefs; label: string; hint: string }[] = [
    {
      key: 'voice',
      label: t('recording.workout.cueVoice'),
      hint: t('recording.workout.cueVoiceHint'),
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
    {
      key: 'halfway',
      label: t('recording.workout.cueHalfway'),
      hint: t('recording.workout.cueHalfwayHint'),
    },
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={false}
    >
      <ScreenContainer>
        {/* Header: back · title · Clear   /   in-run: Adjust goal · Activity keeps running · × */}
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
                        borderColor: active ? (isDark ? colors.primary : INK) : colors.border,
                        opacity: tile.disabled ? 0.55 : 1,
                      },
                    ]}
                    onPress={() => {
                      if (tile.disabled) return;
                      setEditing(false);
                      setType(tile.id);
                    }}
                    disabled={tile.disabled}
                    activeOpacity={0.85}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active, disabled: tile.disabled }}
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
                    <View style={styles.typeTextRow}>
                      <Text
                        style={[
                          styles.typeLabel,
                          { color: active ? '#ffffff' : colors.textPrimary },
                        ]}
                      >
                        {tile.label}
                      </Text>
                      {tile.disabled && (
                        <View style={[styles.soonBadge, { backgroundColor: PRIMARY_SOFT }]}>
                          <Text style={[styles.soonText, { color: PRIMARY_DEEP }]}>
                            {t('recording.workout.comingSoon')}
                          </Text>
                        </View>
                      )}
                    </View>
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

          {/* Target */}
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
                          borderColor: p.active ? (isDark ? colors.primary : INK) : colors.border,
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

          {/* Alerts */}
          {goal && (
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

          {inProgress && goal && (
            <View style={[styles.liveNote, { backgroundColor: colors.aiLight }]}>
              <View style={[styles.liveNoteIcon, { backgroundColor: colors.ai }]}>
                <Ionicons name="sparkles" size={13} color="#ffffff" />
              </View>
              <Text style={[styles.liveNoteText, { color: colors.textPrimary }]}>
                {t('recording.workout.liveNote')}
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
              <Text style={styles.primaryText}>
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
  typeTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  soonBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  soonText: {
    fontSize: msFont(10),
    fontWeight: '700',
    letterSpacing: 0.5,
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
