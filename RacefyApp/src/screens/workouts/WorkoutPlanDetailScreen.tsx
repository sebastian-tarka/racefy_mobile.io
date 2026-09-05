import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomSheet, Button, ScreenContainer, ScreenHeader } from '../../components';
import type { BottomSheetOption } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { useWorkoutPlan } from '../../hooks/useWorkoutPlan';
import { api } from '../../services/api';
import { emitRefresh } from '../../services/refreshEvents';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { Workout } from '../../types/workouts';
import { WEEKDAYS } from '../../types/workouts';
import { formatDurationMinutes, weekdayShort } from '../../utils/workoutPlanFormat';
import { PlanStatusPill } from './components/PlanStatusPill';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutPlanDetail'>;

export function WorkoutPlanDetailScreen({ navigation, route }: Props) {
  const { planId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: plan, isLoading, refetch } = useWorkoutPlan(planId);
  const [planSheet, setPlanSheet] = useState(false);
  const [workoutSheet, setWorkoutSheet] = useState<Workout | null>(null);

  const workouts = [...(plan?.workouts ?? [])].sort((a, b) => a.display_order - b.display_order);

  const run = async (action: () => Promise<unknown>, toast?: string) => {
    try {
      await action();
      emitRefresh('workouts');
      if (toast) Alert.alert('', toast);
    } catch (error: any) {
      Alert.alert('', error.message || t('common.error'));
    }
  };

  const move = (workout: Workout, dir: -1 | 1) => {
    const ids = workouts.map((w) => w.id);
    const i = ids.indexOf(workout.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void run(() => api.reorderWorkouts(planId, ids));
  };

  const planOptions: BottomSheetOption[] = plan
    ? [
        ...(plan.status !== 'active'
          ? [
              {
                id: 'activate',
                icon: 'checkmark-circle-outline' as const,
                title: t('strengthPlans.actions.activate'),
                onPress: () =>
                  Alert.alert('', t('strengthPlans.confirm.activate'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('strengthPlans.actions.activate'),
                      onPress: () =>
                        run(
                          () => api.activateWorkoutPlan(plan.id),
                          t('strengthPlans.toast.activated'),
                        ),
                    },
                  ]),
              },
            ]
          : []),
        {
          id: 'edit',
          icon: 'create-outline',
          title: t('strengthPlans.actions.editPlan'),
          onPress: () => navigation.navigate('WorkoutPlanForm', { planId }),
        },
        {
          id: 'duplicate',
          icon: 'copy-outline',
          title: t('strengthPlans.actions.duplicate'),
          onPress: () =>
            run(() => api.duplicateWorkoutPlan(plan.id), t('strengthPlans.toast.duplicated')),
        },
        {
          id: 'delete',
          icon: 'trash-outline',
          title: t('strengthPlans.actions.deletePlan'),
          color: colors.error,
          onPress: () =>
            Alert.alert('', t('strengthPlans.confirm.deletePlan'), [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('strengthPlans.actions.delete'),
                style: 'destructive',
                onPress: async () => {
                  await run(() => api.deleteWorkoutPlan(plan.id));
                  navigation.goBack();
                },
              },
            ]),
        },
      ]
    : [];

  const workoutOptions = (w: Workout): BottomSheetOption[] => {
    const i = workouts.findIndex((x) => x.id === w.id);
    return [
      {
        id: 'edit',
        icon: 'create-outline',
        title: t('strengthPlans.actions.edit'),
        onPress: () => navigation.navigate('WorkoutForm', { planId, workoutId: w.id }),
      },
      ...(i > 0
        ? [
            {
              id: 'up',
              icon: 'arrow-up-outline' as const,
              title: t('strengthPlans.actions.moveUp'),
              onPress: () => move(w, -1),
            },
          ]
        : []),
      ...(i < workouts.length - 1
        ? [
            {
              id: 'down',
              icon: 'arrow-down-outline' as const,
              title: t('strengthPlans.actions.moveDown'),
              onPress: () => move(w, 1),
            },
          ]
        : []),
      {
        id: 'delete',
        icon: 'trash-outline',
        title: t('strengthPlans.actions.deleteWorkout'),
        color: colors.error,
        onPress: () =>
          Alert.alert('', t('strengthPlans.confirm.deleteWorkout'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('strengthPlans.actions.delete'),
              style: 'destructive',
              onPress: () =>
                run(() => api.deleteWorkout(w.id), t('strengthPlans.toast.workoutDeleted')),
            },
          ]),
      },
    ];
  };

  return (
    <ScreenContainer edges={['top']}>
      <ScreenHeader
        title={plan?.name ?? t('strengthPlans.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          plan ? (
            <TouchableOpacity onPress={() => setPlanSheet(true)} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {isLoading || !plan ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header card */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
          >
            <View style={styles.headerRow}>
              <PlanStatusPill status={plan.status} />
              {plan.source === 'xlsx_import' && (
                <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                  <Ionicons name="document-outline" size={12} /> {plan.source_filename}
                </Text>
              )}
            </View>
            {plan.goal ? (
              <Text style={[styles.goal, { color: colors.textPrimary }]}>{plan.goal}</Text>
            ) : null}
            {plan.description ? (
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {plan.description}
              </Text>
            ) : null}
            {(plan.starts_on || plan.ends_on) && (
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {plan.starts_on ?? '…'} → {plan.ends_on ?? '…'}
              </Text>
            )}
          </View>

          {/* Week strip */}
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            {t('strengthPlans.week').toUpperCase()}
          </Text>
          <View style={styles.week}>
            {WEEKDAYS.map((day) => {
              const w = workouts.find((x) => x.weekday === day);
              const note = plan.schedule_notes?.[`${day}`];
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayCell,
                    {
                      backgroundColor: w ? colors.primary + '1F' : colors.cardBackground,
                      borderColor: w ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() =>
                    w && navigation.navigate('WorkoutDetail', { planId, workoutId: w.id })
                  }
                  disabled={!w}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayLabel, { color: w ? colors.primary : colors.textMuted }]}>
                    {weekdayShort(day, t)}
                  </Text>
                  <Text
                    style={[styles.dayText, { color: w ? colors.textPrimary : colors.textMuted }]}
                    numberOfLines={3}
                  >
                    {w ? w.name : (note ?? t('strengthPlans.restDay'))}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Workouts */}
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            {t('strengthPlans.workouts').toUpperCase()}
          </Text>
          {workouts.length === 0 && (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              {t('strengthPlans.noWorkouts')}
            </Text>
          )}
          {workouts.map((w) => (
            <TouchableOpacity
              key={w.id}
              style={[
                styles.workoutRow,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
              onPress={() => navigation.navigate('WorkoutDetail', { planId, workoutId: w.id })}
              onLongPress={() => setWorkoutSheet(w)}
              activeOpacity={0.8}
            >
              <View style={[styles.dayBadge, { backgroundColor: colors.background }]}>
                <Text style={[styles.dayBadgeText, { color: colors.textSecondary }]}>
                  {w.weekday ? weekdayShort(w.weekday, t) : '—'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.workoutName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {w.day_label ? `${w.day_label} · ` : ''}
                  {w.name}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                  {t('strengthPlans.exercisesCount', {
                    count: w.exercises?.length ?? w.exercises_count ?? 0,
                  })}
                  {w.estimated_duration_minutes
                    ? ` · ${formatDurationMinutes(w.estimated_duration_minutes, t)}`
                    : ''}
                  {w.focus ? ` · ${w.focus}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setWorkoutSheet(w)} hitSlop={10}>
                <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          <Button
            title={t('strengthPlans.addWorkout')}
            variant="outline"
            onPress={() => navigation.navigate('WorkoutForm', { planId })}
            style={{ marginTop: spacing.sm }}
          />
        </ScrollView>
      )}

      <BottomSheet
        visible={planSheet}
        onClose={() => setPlanSheet(false)}
        title={plan?.name}
        options={planOptions}
      />
      <BottomSheet
        visible={workoutSheet != null}
        onClose={() => setWorkoutSheet(null)}
        title={workoutSheet?.name}
        options={workoutSheet ? workoutOptions(workoutSheet) : []}
      />
      {/* Pull-to-refresh is unnecessary: every mutation emits `workouts`. */}
      {void refetch}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  goal: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  meta: {
    fontSize: fontSize.xs,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: spacing.sm,
  },
  week: {
    flexDirection: 'row',
    gap: 4,
  },
  dayCell: {
    flex: 1,
    minHeight: 72,
    padding: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  dayLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  dayText: {
    fontSize: fontSize.xs,
    lineHeight: 13,
  },
  empty: {
    fontSize: fontSize.sm,
    paddingVertical: spacing.sm,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  workoutName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
