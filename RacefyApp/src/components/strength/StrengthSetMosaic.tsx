import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontFamily, fontSize, fontWeight, ms, spacing } from '../../theme';
import type { StrengthSessionSummary } from '../../types/api';
import { StrengthSectionLabel } from './StrengthSectionLabel';
import { isHeavierThanLastTime, isSkippedExercise } from './strengthSession';
import { useStrengthFormat } from './useStrengthFormat';

const TILE_HEIGHT = ms(26);
const TILE_MIN_WIDTH = ms(52);

/**
 * One row per exercise, one tile per set — the strength workout's "map" on the
 * feed card. Accent = done, amber = heavier than last time, dashed = skipped.
 * Tiles are visual only: each row reads out as one accessibility label.
 */
export function StrengthSetMosaic({ session }: { session: StrengthSessionSummary }) {
  const { t } = useTranslation();
  const fmt = useStrengthFormat();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <StrengthSectionLabel>{t('activities.strength.sets')}</StrengthSectionLabel>
      {session.exercises.map((exercise) => {
        const skipped = isSkippedExercise(exercise);
        const spoken = exercise.sets
          .map((s) => (s.is_completed ? fmt.set(s) : t('activities.strength.skippedSet')))
          .join(', ');
        return (
          <View
            key={exercise.exercise_order}
            style={styles.row}
            accessible
            accessibilityLabel={`${exercise.name}: ${spoken}`}
          >
            <Text
              style={[styles.name, { color: skipped ? colors.textMuted : colors.textPrimary }]}
              numberOfLines={1}
            >
              {exercise.name}
            </Text>
            <View style={styles.tiles}>
              {exercise.sets.map((set) =>
                set.is_completed ? (
                  <View
                    key={set.set_number}
                    style={[
                      styles.tile,
                      {
                        backgroundColor: isHeavierThanLastTime(set, exercise)
                          ? colors.warning
                          : colors.primary,
                      },
                    ]}
                  >
                    <Text style={[styles.tileText, { color: colors.onAccent }]} numberOfLines={1}>
                      {fmt.set(set)}
                    </Text>
                  </View>
                ) : (
                  <View
                    key={set.set_number}
                    style={[styles.tile, styles.tileSkipped, { borderColor: colors.textMuted }]}
                  />
                ),
              )}
            </View>
          </View>
        );
      })}
      <View
        style={styles.legend}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <LegendItem color={colors.primary} label={t('activities.strength.legendDone')} />
        <LegendItem color={colors.warning} label={t('activities.strength.legendHeavier')} />
        <LegendItem
          dashed
          color={colors.textMuted}
          label={t('activities.strength.legendSkipped')}
        />
      </View>
    </View>
  );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          dashed
            ? { borderWidth: 1, borderStyle: 'dashed', borderColor: color }
            : { backgroundColor: color },
        ]}
      />
      <Text style={[styles.legendText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    width: ms(104),
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  tiles: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tile: {
    height: TILE_HEIGHT,
    minWidth: TILE_MIN_WIDTH,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSkipped: {
    width: TILE_MIN_WIDTH,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  tileText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: spacing.xs,
    paddingTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: fontSize.xs,
  },
});
