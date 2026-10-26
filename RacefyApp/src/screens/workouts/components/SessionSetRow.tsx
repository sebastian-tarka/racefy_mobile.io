import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import type { SetValues } from '../../../hooks/useWorkoutSession';
import { borderRadius, fontSize, msFont, spacing } from '../../../theme';
import type { WorkoutSessionSet } from '../../../types/workouts';
import { formatTarget } from '../../../utils/workoutPlanFormat';

export type Draft = { weight: string; reps: string };

function num(text: string): number | null {
  const n = parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** What the inputs show before the athlete types: the logged value, else the plan. */
function defaultDraft(set: WorkoutSessionSet): Draft {
  return {
    weight:
      set.weight_kg != null
        ? String(set.weight_kg)
        : set.planned.suggested_weight_kg != null
          ? String(set.planned.suggested_weight_kg)
          : '',
    reps:
      set.planned.target_type === 'seconds'
        ? set.duration_seconds != null
          ? String(set.duration_seconds)
          : (set.planned.reps_max ?? set.planned.reps_min ?? '').toString()
        : set.reps != null
          ? String(set.reps)
          : (set.planned.reps_max ?? set.planned.reps_min ?? '').toString(),
  };
}

interface Props {
  set: WorkoutSessionSet;
  /** What the athlete typed, if anything — the defaults are derived here. */
  override: Draft | undefined;
  isActive: boolean;
  inProgress: boolean;
  onDraftChange: (setId: number, patch: Partial<Draft>, base: Draft) => void;
  onStart: (setId: number) => void;
  onComplete: (setId: number, values: SetValues) => void;
  onReopen: (setId: number) => void;
  onRemove: (setId: number) => void;
}

/**
 * One set: number and target, reps (or seconds) and kg, Start → Done → ✓.
 * Memoized — the session screen ticks every second for the stopwatch, and
 * without it every row of the exercise re-rendered with it.
 */
export const SessionSetRow = React.memo(function SessionSetRow({
  set,
  override,
  isActive,
  inProgress,
  onDraftChange,
  onStart,
  onComplete,
  onReopen,
  onRemove,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const timed = set.planned.target_type === 'seconds';
  const draft = override ?? defaultDraft(set);
  const started = !!set.started_at && !set.is_completed;
  const target = formatTarget(
    set.planned.target_type,
    set.planned.reps_min,
    set.planned.reps_max,
    t,
  );

  return (
    <View
      key={set.id}
      style={[
        styles.setRow,
        {
          backgroundColor: set.is_completed
            ? colors.primary + '14'
            : isActive
              ? colors.cardBackground
              : 'transparent',
          borderColor: isActive && !set.is_completed ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.setNo}>
        <Text
          style={[
            styles.setNoText,
            { color: set.is_completed ? colors.primary : colors.textMuted },
          ]}
        >
          {set.set_number}
        </Text>
        <Text style={[styles.setTarget, { color: colors.textMuted }]}>{target}</Text>
      </View>

      <View style={styles.inputBox}>
        <TextInput
          value={draft.reps}
          onChangeText={(v) => onDraftChange(set.id, { reps: v }, draft)}
          keyboardType="number-pad"
          editable={inProgress && !set.is_completed}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
          placeholder="—"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={[styles.unit, { color: colors.textMuted }]}>
          {t(timed ? 'strengthPlans.session.sec' : 'strengthPlans.session.reps')}
        </Text>
      </View>
      <View style={styles.inputBox}>
        <TextInput
          value={draft.weight}
          onChangeText={(v) => onDraftChange(set.id, { weight: v }, draft)}
          keyboardType="decimal-pad"
          editable={inProgress && !set.is_completed}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
          placeholder="—"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={[styles.unit, { color: colors.textMuted }]}>
          {t('strengthPlans.session.kg')}
        </Text>
      </View>

      {set.is_completed ? (
        <TouchableOpacity
          style={[styles.stateButton, { backgroundColor: colors.primary }]}
          onPress={() => inProgress && onReopen(set.id)}
          onLongPress={() => inProgress && onRemove(set.id)}
          accessibilityLabel={t('strengthPlans.session.undo')}
        >
          <Ionicons name="checkmark" size={18} color="#ffffff" />
        </TouchableOpacity>
      ) : started ? (
        <TouchableOpacity
          style={[styles.stateButton, styles.doneButton, { backgroundColor: colors.primary }]}
          onPress={() =>
            onComplete(set.id, {
              weightKg: num(draft.weight),
              reps: timed ? undefined : Math.round(num(draft.reps) ?? 0) || null,
              durationSeconds: timed ? Math.round(num(draft.reps) ?? 0) || null : undefined,
            })
          }
          disabled={!inProgress}
        >
          <Text style={styles.stateText}>{t('strengthPlans.session.done')}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.stateButton,
            styles.doneButton,
            { backgroundColor: isActive ? colors.textPrimary : colors.border },
          ]}
          onPress={() => onStart(set.id)}
          disabled={!inProgress}
        >
          <Text
            style={[
              styles.stateText,
              { color: isActive ? colors.background : colors.textSecondary },
            ]}
          >
            {t('strengthPlans.session.start')}
          </Text>
        </TouchableOpacity>
      )}

      {/* A set you add mid-session has to be removable the same way. This
          used to be a long press on the tick of an already-completed set —
          undiscoverable, and no help at all for the extra set you just
          added and have not done yet. */}
      {inProgress && (
        <TouchableOpacity
          style={styles.removeSet}
          onPress={() => onRemove(set.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('strengthPlans.session.removeSet')}
        >
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  doneButton: {
    width: 72,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: '600',
    paddingVertical: 0,
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeSet: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNo: {
    width: 44,
  },
  setNoText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  setTarget: {
    fontSize: msFont(9),
  },
  stateButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  unit: {
    fontSize: fontSize.xs,
    width: 30,
  },
});
