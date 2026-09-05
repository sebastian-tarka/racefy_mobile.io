import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, ScreenHeader } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { emitRefresh, useRefreshOn } from '../../services/refreshEvents';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { PlannedSession, WorkoutSessionConflict } from '../../types/workouts';
import { formatTime } from '../../utils/formatters';
import { formatDurationMinutes, weekdayShort } from '../../utils/workoutPlanFormat';
import { ResumeSessionBanner } from './components/ResumeSessionBanner';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutSchedule'>;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * The plan's next two weeks: days with a workout or a note. Today is
 * highlighted; a workout row starts a session (or resumes the open one),
 * a logged one shows its outcome and stats.
 */
export function WorkoutScheduleScreen({ navigation, route }: Props) {
  const { planId } = route.params;
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [days, setDays] = useState<PlannedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyWorkoutId, setBusyWorkoutId] = useState<number | null>(null);
  const today = isoDate(new Date());

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setIsRefreshing(true);
      else setIsLoading(true);
      try {
        setDays(await api.getWorkoutPlanSchedule(planId));
      } catch (error: any) {
        logger.error('api', 'Failed to load workout schedule', { planId, error: error.message });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [planId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useRefreshOn('workouts', () => void load());

  const openSession = (sessionId: number) => navigation.navigate('WorkoutSession', { sessionId });

  const start = async (day: PlannedSession) => {
    if (!day.workout) return;
    setBusyWorkoutId(day.workout.id);
    try {
      const session = await api.startWorkoutSession(day.workout.id, day.date);
      emitRefresh('workouts');
      openSession(session.id);
    } catch (error: any) {
      const conflict = error as Partial<WorkoutSessionConflict> & { status?: number };
      if (error.status === 409 && conflict.reason === 'in_progress_exists' && conflict.session) {
        const open = conflict.session;
        Alert.alert(
          '',
          t('strengthPlans.schedule.conflictInProgress', { name: open.workout_name }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('strengthPlans.schedule.resume'), onPress: () => openSession(open.id) },
          ],
        );
      } else if (error.status === 409 && conflict.reason === 'already_logged') {
        Alert.alert('', t('strengthPlans.schedule.conflictLogged'));
      } else {
        Alert.alert('', error.message || t('common.error'));
      }
    } finally {
      setBusyWorkoutId(null);
    }
  };

  const skip = (day: PlannedSession) => {
    if (!day.workout) return;
    const workoutId = day.workout.id;
    Alert.alert('', t('strengthPlans.schedule.confirmSkip'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('strengthPlans.schedule.skip'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.skipPlannedWorkout(workoutId, day.date);
            emitRefresh('workouts');
          } catch (error: any) {
            Alert.alert('', error.message || t('common.error'));
          }
        },
      },
    ]);
  };

  const renderDay = ({ item }: { item: PlannedSession }) => {
    const isToday = item.date === today;
    const date = new Date(item.date);
    const dateLabel = date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
    const session = item.session;
    const status = session?.status;

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBackground,
            borderColor: isToday ? colors.primary : colors.border,
            borderWidth: isToday ? 2 : 1,
          },
        ]}
      >
        <View style={styles.dateCol}>
          <Text
            style={[styles.dateWeekday, { color: isToday ? colors.primary : colors.textMuted }]}
          >
            {isToday ? t('strengthPlans.schedule.today') : weekdayShort(item.weekday, t)}
          </Text>
          <Text style={[styles.dateDay, { color: colors.textPrimary }]}>{dateLabel}</Text>
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          {item.workout ? (
            <>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={2}>
                {item.workout.day_label ? `${item.workout.day_label} · ` : ''}
                {item.workout.name}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                {t('strengthPlans.exercisesCount', { count: item.workout.exercises_count ?? 0 })}
                {item.workout.estimated_duration_minutes
                  ? ` · ${formatDurationMinutes(item.workout.estimated_duration_minutes, t)}`
                  : ''}
              </Text>
            </>
          ) : (
            <Text style={[styles.note, { color: colors.textSecondary }]}>{item.note}</Text>
          )}
          {item.workout && item.note ? (
            <Text style={[styles.meta, { color: colors.textMuted }]}>{item.note}</Text>
          ) : null}

          {session && status !== 'in_progress' && (
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor:
                      status === 'completed' ? colors.primary + '1F' : colors.textMuted + '1F',
                  },
                ]}
              >
                <Ionicons
                  name={status === 'completed' ? 'checkmark-circle' : 'remove-circle-outline'}
                  size={14}
                  color={status === 'completed' ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: status === 'completed' ? colors.primary : colors.textMuted },
                  ]}
                >
                  {t(
                    status === 'completed'
                      ? 'strengthPlans.schedule.completed'
                      : 'strengthPlans.schedule.skipped',
                  )}
                </Text>
              </View>
              {status === 'completed' && session.stats && (
                <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                  {t('strengthPlans.schedule.statsLine', {
                    sets: session.stats.sets_completed,
                    volume: Math.round(session.stats.volume_kg),
                    duration: formatTime(session.duration_seconds ?? 0),
                  })}
                </Text>
              )}
            </View>
          )}
          {status === 'completed' && session?.activity_id && (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ActivityDetail', { activityId: session.activity_id as number })
              }
            >
              <Text style={[styles.link, { color: colors.primary }]}>
                {t('strengthPlans.schedule.openActivity')} ›
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {item.workout && (!session || status === 'in_progress') && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.primary }]}
              onPress={() =>
                status === 'in_progress' && session ? openSession(session.id) : start(item)
              }
              disabled={busyWorkoutId === item.workout.id}
              activeOpacity={0.85}
            >
              {busyWorkoutId === item.workout.id ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="play" size={14} color="#ffffff" />
                  <Text style={styles.startText}>
                    {t(
                      status === 'in_progress'
                        ? 'strengthPlans.schedule.resume'
                        : 'strengthPlans.schedule.start',
                    )}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {!session && (
              <TouchableOpacity onPress={() => skip(item)} hitSlop={8}>
                <Text style={[styles.skipText, { color: colors.textMuted }]}>
                  {t('strengthPlans.schedule.skip')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer edges={['top']}>
      <ScreenHeader
        title={t('strengthPlans.schedule.title')}
        showBack
        onBack={() => navigation.goBack()}
      />
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={days}
          keyExtractor={(item) => item.date}
          renderItem={renderDay}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              <ResumeSessionBanner />
              <Text style={[styles.range, { color: colors.textMuted }]}>
                {t('strengthPlans.schedule.range').toUpperCase()}
              </Text>
            </>
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              {t('strengthPlans.schedule.empty')}
            </Text>
          }
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  range: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  dateCol: {
    width: 48,
    alignItems: 'center',
    gap: 2,
  },
  dateWeekday: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  dateDay: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  note: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  meta: {
    fontSize: fontSize.xs,
  },
  statusRow: {
    gap: 4,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  link: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginTop: 2,
  },
  actions: {
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    minWidth: 84,
    justifyContent: 'center',
  },
  startText: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  skipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    padding: spacing.xl,
    fontSize: fontSize.sm,
  },
});
