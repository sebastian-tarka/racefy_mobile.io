import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import type { WorkoutExercise } from '../../types/workouts';
import {
  formatDurationMinutes,
  formatPrescription,
  weekdayLong,
} from '../../utils/workoutPlanFormat';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutDetail'>;

/**
 * One training unit: header (day, focus, duration, notes) and the ordered
 * exercise prescriptions. Tap a row to edit it, hold to reorder / remove.
 */
export function WorkoutDetailScreen({ navigation, route }: Props) {
  const { planId, workoutId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: plan, isLoading } = useWorkoutPlan(planId);
  const [rowSheet, setRowSheet] = useState<WorkoutExercise | null>(null);

  const workout = plan?.workouts?.find((w) => w.id === workoutId) ?? null;
  const rows = [...(workout?.exercises ?? [])].sort((a, b) => a.display_order - b.display_order);

  const run = async (action: () => Promise<unknown>, toast?: string) => {
    try {
      await action();
      emitRefresh('workouts');
      if (toast) Alert.alert('', toast);
    } catch (error: any) {
      Alert.alert('', error.message || t('common.error'));
    }
  };

  const move = (row: WorkoutExercise, dir: -1 | 1) => {
    const ids = rows.map((r) => r.id);
    const i = ids.indexOf(row.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void run(() => api.reorderWorkoutExercises(workoutId, ids));
  };

  const openVideo = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('', t('common.error')));
  };

  const rowOptions = (row: WorkoutExercise): BottomSheetOption[] => {
    const i = rows.findIndex((r) => r.id === row.id);
    return [
      {
        id: 'edit',
        icon: 'create-outline',
        title: t('strengthPlans.actions.edit'),
        onPress: () =>
          navigation.navigate('WorkoutExerciseForm', {
            planId,
            workoutId,
            workoutExerciseId: row.id,
          }),
      },
      ...(row.video_url
        ? [
            {
              id: 'video',
              icon: 'logo-youtube' as const,
              title: t('strengthPlans.actions.openVideo'),
              onPress: () => openVideo(row.video_url as string),
            },
          ]
        : []),
      ...(i > 0
        ? [
            {
              id: 'up',
              icon: 'arrow-up-outline' as const,
              title: t('strengthPlans.actions.moveUp'),
              onPress: () => move(row, -1),
            },
          ]
        : []),
      ...(i < rows.length - 1
        ? [
            {
              id: 'down',
              icon: 'arrow-down-outline' as const,
              title: t('strengthPlans.actions.moveDown'),
              onPress: () => move(row, 1),
            },
          ]
        : []),
      {
        id: 'remove',
        icon: 'trash-outline',
        title: t('strengthPlans.actions.removeExercise'),
        color: colors.error,
        onPress: () =>
          Alert.alert('', t('strengthPlans.confirm.removeExercise'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('strengthPlans.actions.delete'),
              style: 'destructive',
              onPress: () =>
                run(
                  () => api.deleteWorkoutExercise(row.id),
                  t('strengthPlans.toast.exerciseRemoved'),
                ),
            },
          ]),
      },
    ];
  };

  return (
    <ScreenContainer edges={['top']}>
      <ScreenHeader
        title={workout?.name ?? ''}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          workout ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('WorkoutForm', { planId, workoutId })}
              hitSlop={8}
            >
              <Ionicons name="create-outline" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {isLoading || !workout ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {[
                workout.day_label,
                workout.weekday ? weekdayLong(workout.weekday, t) : t('strengthPlans.noWeekday'),
                workout.focus,
                formatDurationMinutes(workout.estimated_duration_minutes, t),
                t('strengthPlans.exercisesCount', { count: rows.length }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {workout.notes ? (
              <Text style={[styles.notes, { color: colors.textPrimary }]}>{workout.notes}</Text>
            ) : null}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            {t('strengthPlans.workout.exercises').toUpperCase()}
          </Text>
          {rows.length === 0 && (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              {t('strengthPlans.workout.noExercises')}
            </Text>
          )}
          {rows.map((row, index) => (
            <TouchableOpacity
              key={row.id}
              style={[
                styles.row,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
              onPress={() =>
                navigation.navigate('WorkoutExerciseForm', {
                  planId,
                  workoutId,
                  workoutExerciseId: row.id,
                })
              }
              onLongPress={() => setRowSheet(row)}
              activeOpacity={0.8}
            >
              <View style={[styles.index, { backgroundColor: colors.background }]}>
                <Text style={[styles.indexText, { color: colors.textSecondary }]}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={2}>
                  {row.exercise.name}
                </Text>
                <Text style={[styles.prescription, { color: colors.primary }]}>
                  {formatPrescription(row, t)}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={2}>
                  {[
                    row.load_note,
                    row.target_weight_kg != null
                      ? t('strengthPlans.workout.weight', { kg: row.target_weight_kg })
                      : null,
                    row.tempo ? t('strengthPlans.workout.tempo', { tempo: row.tempo }) : null,
                    row.superset_group != null
                      ? t('strengthPlans.workout.superset', { group: row.superset_group })
                      : null,
                    row.notes,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {row.video_url ? (
                <TouchableOpacity
                  onPress={() => openVideo(row.video_url as string)}
                  hitSlop={10}
                  accessibilityLabel={t('strengthPlans.actions.openVideo')}
                >
                  <Ionicons name="logo-youtube" size={22} color={colors.error} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => setRowSheet(row)} hitSlop={10}>
                <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          {rows.length > 1 && (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {t('strengthPlans.workout.holdHint')}
            </Text>
          )}

          <Button
            title={t('strengthPlans.workout.addExercise')}
            variant="outline"
            onPress={() => navigation.navigate('WorkoutExerciseForm', { planId, workoutId })}
            style={{ marginTop: spacing.sm }}
          />
        </ScrollView>
      )}

      <BottomSheet
        visible={rowSheet != null}
        onClose={() => setRowSheet(null)}
        title={rowSheet?.exercise.name}
        options={rowSheet ? rowOptions(rowSheet) : []}
      />
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
  meta: {
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  notes: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: spacing.sm,
  },
  empty: {
    fontSize: fontSize.sm,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  index: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  prescription: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  hint: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
});
