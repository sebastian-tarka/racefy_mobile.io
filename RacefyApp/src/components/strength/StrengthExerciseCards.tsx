import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontFamily, fontSize, fontWeight, spacing } from '../../theme';
import { formatTarget } from '../../utils/workoutPlanFormat';
import type { StrengthExercise, StrengthSessionSummary } from '../../types/api';
import { StrengthChip } from './StrengthChip';
import { cardStyles } from './cardStyles';
import {
  formatKg,
  formatVolume,
  isSkippedExercise,
  overPlanKg,
  setDetailLabel,
} from './strengthSession';

/**
 * The exercises set by set. On a phone one tile per exercise instead of the
 * web's wide table: name, plan, "+5 kg vs plan", a 4-column grid of sets and
 * the volume. A skipped exercise is a dashed, muted tile — not a red one.
 */
export function StrengthExerciseCards({
  session,
  style,
}: {
  session: StrengthSessionSummary;
  style?: ViewStyle;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Card style={style}>
      <Text style={[cardStyles.title, { color: colors.textPrimary }]} accessibilityRole="header">
        {t('activities.strength.exercisesTitle')}
      </Text>
      <View style={[cardStyles.body, styles.list]}>
        {session.exercises.map((exercise) => (
          <ExerciseTile key={exercise.exercise_order} exercise={exercise} />
        ))}
      </View>
    </Card>
  );
}

function ExerciseTile({ exercise }: { exercise: StrengthExercise }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const locale = i18n.language;
  const skipped = isSkippedExercise(exercise);
  const overPlan = overPlanKg(exercise);
  const { planned } = exercise;
  const plan = [
    `${planned.sets} × ${formatTarget(planned.target_type ?? undefined, planned.reps_min, planned.reps_max, t)}`,
    planned.suggested_weight_kg != null
      ? `${formatKg(planned.suggested_weight_kg, locale)} kg`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        styles.tile,
        skipped
          ? { borderStyle: 'dashed', borderColor: colors.textMuted, opacity: 0.75 }
          : { borderColor: colors.border, backgroundColor: colors.background },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={[styles.name, { color: skipped ? colors.textMuted : colors.textPrimary }]}>
            {exercise.name}
          </Text>
          <Text
            style={[styles.plan, { color: colors.textSecondary }]}
            accessibilityLabel={`${t('activities.strength.colPlan')}: ${plan}`}
          >
            {plan}
          </Text>
        </View>
        {skipped ? (
          <Text style={[styles.skippedLabel, { color: colors.textMuted }]}>
            {t('activities.strength.skipped')}
          </Text>
        ) : (
          <Text
            style={[styles.volume, { color: colors.textPrimary }]}
            accessibilityLabel={`${t('activities.strength.colVolume')}: ${
              exercise.volume_kg > 0 ? `${formatVolume(exercise.volume_kg, locale)} kg` : '—'
            }`}
          >
            {exercise.volume_kg > 0 ? `${formatVolume(exercise.volume_kg, locale)} kg` : '—'}
          </Text>
        )}
      </View>

      {overPlan != null && (
        <StrengthChip
          value={t('activities.strength.overPlan', { kg: formatKg(overPlan, locale) })}
          style={styles.chip}
        />
      )}

      {!skipped && (
        <View style={styles.grid}>
          {exercise.sets.map((set) => {
            const label = t('activities.strength.setNumber', { number: set.set_number });
            const value = set.is_completed ? setDetailLabel(set, locale) : '—';
            return (
              <View key={set.set_number} style={styles.cell}>
                <View
                  style={[
                    styles.setChip,
                    set.is_completed
                      ? { borderColor: colors.border, backgroundColor: colors.cardBackground }
                      : { borderColor: colors.textMuted, borderStyle: 'dashed' },
                  ]}
                  accessible
                  accessibilityLabel={`${label}: ${set.is_completed ? value : t('activities.strength.skippedSet')}`}
                >
                  <Text style={[styles.setLabel, { color: colors.textMuted }]} numberOfLines={1}>
                    {label}
                  </Text>
                  <Text
                    style={[
                      styles.setValue,
                      { color: set.is_completed ? colors.textPrimary : colors.textMuted },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {value}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  tile: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerMain: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  plan: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  volume: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  skippedLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  chip: {
    marginTop: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    marginHorizontal: -2,
  },
  cell: {
    width: '25%',
    padding: 2,
  },
  setChip: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  setLabel: {
    fontSize: fontSize.xs,
  },
  setValue: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginTop: 1,
  },
});
