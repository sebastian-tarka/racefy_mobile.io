import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import { borderRadius, msFont, spacing } from '../../../../theme';
import type { NextWorkoutSession } from '../../../../types/workouts';
import { STRENGTH_ACCENT } from '../../../../utils/workoutPlanFormat';

interface Props {
  next: NextWorkoutSession;
  /** Start the workout (it may be tomorrow's — "start early"). */
  onStart: (workoutId: number, date: string) => void;
  /** No workout to start: open the active plan to pick one. */
  onOpenPlan: (planId: number) => void;
  /** "Another session or plan". */
  onOpenPlans: () => void;
  /** Workout being started right now, for the spinner. */
  busyWorkoutId: number | null;
}

/**
 * The gym counterpart to the running hero on Home (design "Racefy v2" →
 * StrengthCTA): the lighter sibling — same radius and rhythm, surface instead
 * of hero ink — so the two starts read as a pair, not as two heroes.
 *
 * Today's workout, else the nearest one ahead ("next, tomorrow · start early"),
 * else a quiet "nothing scheduled" entry into the plan. An open session is not
 * this card's job — the resume banner above it owns that — and without an
 * active strength plan the card stays out of the way entirely.
 */
export function StrengthNextCard({ next, onStart, onOpenPlan, onOpenPlans, busyWorkoutId }: Props) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();

  if (next.state === 'in_progress' || next.state === 'no_active_plan' || !next.plan) return null;

  const plan = next.plan;
  const workout = next.state === 'today' || next.state === 'upcoming' ? next.workout : null;
  const date = next.date;
  const has = !!workout && !!date;
  const isToday = next.state === 'today';

  const when =
    next.days_ahead === 1
      ? t('home.strength.tomorrow')
      : date
        ? new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'long' })
        : '';
  const eyebrow = !has
    ? t('home.strength.eyebrow')
    : isToday
      ? t('home.strength.eyebrowToday')
      : t('home.strength.eyebrowNext', { when });

  const minutes = workout?.estimated_duration_minutes;
  const meta = workout
    ? [
        t('home.strength.exercises', { count: workout.exercises_count }),
        t('home.strength.sets', { count: workout.sets_count }),
        minutes ? t('home.strength.minutes', { count: minutes }) : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : t('home.strength.noneBody');

  const busy = !!workout && busyWorkoutId === workout.id;
  const onPress = () => (workout && date ? onStart(workout.id, date) : onOpenPlan(plan.id));

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.cardBackground, borderColor: colors.border },
        ]}
        onPress={onPress}
        disabled={busy}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <View
          style={[
            styles.icon,
            { backgroundColor: has ? STRENGTH_ACCENT + '1F' : colors.background },
          ]}
        >
          <Ionicons name="barbell" size={23} color={has ? STRENGTH_ACCENT : colors.textMuted} />
        </View>

        <View style={styles.body}>
          <Text
            style={[styles.eyebrow, { color: isToday ? STRENGTH_ACCENT : colors.textMuted }]}
            numberOfLines={2}
          >
            {eyebrow}
          </Text>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
            {workout ? workout.name : t('home.strength.noneTitle')}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={2}>
            {meta}
          </Text>
        </View>

        <View
          style={[styles.go, { backgroundColor: has ? colors.textPrimary : colors.background }]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.cardBackground} />
          ) : (
            <Ionicons
              name={has ? 'play' : 'chevron-forward'}
              size={18}
              color={has ? colors.cardBackground : colors.textSecondary}
            />
          )}
        </View>
      </TouchableOpacity>

      {has && (
        <TouchableOpacity
          style={styles.more}
          onPress={onOpenPlans}
          hitSlop={6}
          accessibilityRole="button"
        >
          <Ionicons name="list" size={14} color={colors.textSecondary} />
          <Text style={[styles.moreText, { color: colors.textSecondary }]}>
            {t('home.strength.another')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 5,
    paddingVertical: spacing.sm + 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: msFont(10),
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    lineHeight: msFont(13),
  },
  title: {
    fontSize: msFont(15.5),
    fontWeight: '700',
    marginTop: 3,
    lineHeight: msFont(19),
  },
  meta: {
    fontSize: msFont(11.5),
    marginTop: 3,
  },
  go: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
    height: 30,
  },
  moreText: {
    fontSize: msFont(12),
    fontWeight: '600',
  },
});
