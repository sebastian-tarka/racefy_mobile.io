import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomSheet, ScreenContainer, ScreenHeader } from '../../components';
import type { BottomSheetOption } from '../../components';
import { useStartWorkoutSession } from '../../hooks/useStartWorkoutSession';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { emitRefresh, useRefreshOn } from '../../services/refreshEvents';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { PlannedSession, WorkoutSession } from '../../types/workouts';
import { formatTime } from '../../utils/formatters';
import { formatDurationMinutes, weekdayShort } from '../../utils/workoutPlanFormat';
import { ResumeSessionBanner } from './components/ResumeSessionBanner';
import { ResumeSessionSheet } from './components/ResumeSessionSheet';
import { SessionConflictDialog, type SessionConflict } from './components/SessionConflictDialog';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutSchedule'>;

/** A week back, so a missed Monday is still reachable; two weeks ahead to plan. */
const RANGE_BACK_DAYS = 7;
const RANGE_AHEAD_DAYS = 13;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/** 409s either name a reason and carry the offending session, or only translate. */
function readConflict(error: any): SessionConflict | null {
  if (error?.status !== 409) return null;
  if (
    (error.reason === 'in_progress_exists' || error.reason === 'already_logged') &&
    error.session
  ) {
    return { reason: error.reason, session: error.session as WorkoutSession };
  }
  return null;
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
  const today = isoDate(new Date());

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setIsRefreshing(true);
      else setIsLoading(true);
      try {
        setDays(
          await api.getWorkoutPlanSchedule(planId, {
            from: shiftDays(isoDate(new Date()), -RANGE_BACK_DAYS),
            to: shiftDays(isoDate(new Date()), RANGE_AHEAD_DAYS),
          }),
        );
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

  const openSession = useCallback(
    (sessionId: number) => navigation.navigate('WorkoutSession', { sessionId }),
    [navigation],
  );

  const [actionsFor, setActionsFor] = useState<PlannedSession | null>(null);
  const [movingDay, setMovingDay] = useState<PlannedSession | null>(null);
  const [resumeFor, setResumeFor] = useState<{ session: WorkoutSession; name: string } | null>(
    null,
  );
  const [conflict, setConflict] = useState<SessionConflict | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const formatDay = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleDateString(i18n.language, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
    [i18n.language],
  );

  /**
   * Which days already hold this workout. Dropping onto one is a guaranteed
   * 409, so the request is never sent — the server's answer is predictable from
   * the calendar we already have.
   */
  const datesWithWorkout = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const day of days) {
      if (!day.workout) continue;
      const set = map.get(day.workout.id) ?? new Set<string>();
      set.add(day.date);
      map.set(day.workout.id, set);
    }
    return map;
  }, [days]);

  /**
   * Moving is for a day nothing has happened on yet. A session in progress or
   * already logged is history, and history does not move.
   */
  const canMove = (day: PlannedSession) =>
    !!day.workout && (!day.session || day.session.status === 'planned');

  const handleError = (error: any) => {
    const known = readConflict(error);
    if (known) {
      setConflict(known);
      return true;
    }
    // 409s without a reason, and 429s, are already phrased by the server.
    Alert.alert('', error?.message || t('common.error'));
    return false;
  };

  const moveDay = async (day: PlannedSession, to: string) => {
    if (!day.workout) return;
    setIsBusy(true);
    try {
      await api.moveWorkoutSession({ workout_id: day.workout.id, from: day.date, to });
      emitRefresh('workouts');
      await load('refresh');
    } catch (error: any) {
      handleError(error);
    } finally {
      setIsBusy(false);
    }
  };

  const resumeSession = async (sessionId: number, scheduledFor?: string) => {
    setIsBusy(true);
    try {
      const session = await api.resumeWorkoutSession(sessionId, scheduledFor);
      emitRefresh('workouts');
      setResumeFor(null);
      openSession(session.id);
    } catch (error: any) {
      // `already_logged` only means "pick another day" — leave the sheet open.
      const known = readConflict(error);
      if (known?.reason === 'in_progress_exists') setResumeFor(null);
      handleError(error);
    } finally {
      setIsBusy(false);
    }
  };

  const { start: startSession, busyWorkoutId } = useStartWorkoutSession(openSession);
  const start = (day: PlannedSession) => {
    if (day.workout) void startSession(day.workout.id, day.date);
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

  /** Undo a skip: the skipped session is the only record of it, so it goes. */
  const undoSkip = async (sessionId: number) => {
    try {
      await api.deleteWorkoutSession(sessionId);
      emitRefresh('workouts');
    } catch (error: any) {
      Alert.alert('', error.message || t('common.error'));
    }
  };

  /**
   * Dragging a row is not the only way in: it is unreachable with a screen
   * reader and awkward when the target day is off screen. Long-pressing a row
   * offers the same operations, and both paths end in the same call.
   */
  const dayActions = (day: PlannedSession): BottomSheetOption[] => {
    const session = day.session;
    const options: BottomSheetOption[] = [];

    if (canMove(day)) {
      options.push({
        id: 'move',
        icon: 'calendar-outline',
        title: t('strengthPlans.schedule.moveTo'),
        onPress: () => setMovingDay(day),
      });
    }
    if (session?.status === 'skipped') {
      options.push({
        id: 'resume',
        icon: 'refresh-outline',
        title: t('strengthPlans.schedule.resumeSkipped'),
        onPress: () =>
          setResumeFor({ session: session as WorkoutSession, name: day.workout?.name ?? '' }),
      });
    }
    if (day.workout && !session) {
      options.push({
        id: 'start',
        icon: 'play-outline',
        title: t('strengthPlans.schedule.start'),
        onPress: () => start(day),
      });
      options.push({
        id: 'skip',
        icon: 'remove-circle-outline',
        title: t('strengthPlans.schedule.skip'),
        color: colors.error,
        onPress: () => skip(day),
      });
    }
    return options;
  };

  const handleMoveDate = (event: DateTimePickerEvent, selected?: Date) => {
    const day = movingDay;
    setMovingDay(null);
    if (!selected || !day?.workout) return;

    const to = isoDate(selected);
    if (to === day.date) return;

    // A day that already holds this workout would answer 409; say so instead.
    if (datesWithWorkout.get(day.workout.id)?.has(to)) {
      Alert.alert('', t('strengthPlans.schedule.alreadyOnDay', { date: formatDay(to) }));
      return;
    }
    void moveDay(day, to);
  };

  const renderDay = ({ item }: { item: PlannedSession }) => {
    const isToday = item.date === today;
    const date = new Date(item.date);
    const dateLabel = date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
    const session = item.session;
    const status = session?.status;

    const hasActions = !!item.workout;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBackground,
            borderColor: isToday ? colors.primary : colors.border,
            borderWidth: isToday ? 2 : 1,
          },
        ]}
        onLongPress={hasActions ? () => setActionsFor(item) : undefined}
        activeOpacity={hasActions ? 0.85 : 1}
        disabled={!hasActions}
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
              <Text
                style={[
                  styles.name,
                  { color: colors.textPrimary },
                  status === 'skipped' && styles.nameSkipped,
                ]}
                numberOfLines={2}
              >
                {item.workout.day_label ? `${item.workout.day_label} · ` : ''}
                {item.workout.name}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                {t('strengthPlans.exercisesCount', { count: item.workout.exercises_count ?? 0 })}
                {item.workout.estimated_duration_minutes
                  ? ` · ${formatDurationMinutes(item.workout.estimated_duration_minutes, t)}`
                  : ''}
              </Text>
              {/* A moved day is not "off plan" — it is the plan, deliberately
                  rescheduled, and the chip says where it came from. */}
              {!!session?.moved_from && (
                <View style={[styles.movedChip, { backgroundColor: colors.primary + '1A' }]}>
                  <Ionicons name="swap-horizontal" size={12} color={colors.primary} />
                  <Text style={[styles.movedText, { color: colors.primary }]} numberOfLines={1}>
                    {t('strengthPlans.schedule.movedFrom', {
                      date: formatDay(session.moved_from),
                    })}
                  </Text>
                </View>
              )}
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
              {status === 'skipped' && (
                <View style={styles.skippedActions}>
                  <TouchableOpacity
                    onPress={() =>
                      setResumeFor({
                        session: session as WorkoutSession,
                        name: item.workout?.name ?? '',
                      })
                    }
                    hitSlop={8}
                  >
                    <Text style={[styles.link, { color: colors.primary }]}>
                      {t('strengthPlans.schedule.resumeSkipped')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => undoSkip(session.id)} hitSlop={8}>
                    <Text style={[styles.link, { color: colors.textMuted }]}>
                      {t('strengthPlans.schedule.undoSkip')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
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
                <TouchableOpacity
                  style={[styles.skipButton, { borderColor: colors.border }]}
                  onPress={() => skip(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                    {t('strengthPlans.schedule.skip')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
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
      <BottomSheet
        visible={actionsFor != null}
        onClose={() => setActionsFor(null)}
        title={actionsFor?.workout?.name}
        options={actionsFor ? dayActions(actionsFor) : []}
      />

      {movingDay && (
        <DateTimePicker
          value={new Date(movingDay.date)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleMoveDate}
        />
      )}

      <ResumeSessionSheet
        visible={resumeFor != null}
        skippedOn={resumeFor?.session.scheduled_for ?? today}
        workoutName={resumeFor?.name ?? ''}
        isBusy={isBusy}
        onClose={() => setResumeFor(null)}
        onConfirm={(scheduledFor) =>
          resumeFor && void resumeSession(resumeFor.session.id, scheduledFor)
        }
        formatDate={formatDay}
      />

      <SessionConflictDialog
        conflict={conflict}
        onClose={() => setConflict(null)}
        onOpenSession={(sessionId) => {
          setConflict(null);
          openSession(sessionId);
        }}
        onResumeSession={(session) => {
          setConflict(null);
          setResumeFor({ session, name: session.workout_name });
        }}
        formatDate={formatDay}
      />
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
  nameSkipped: {
    textDecorationLine: 'line-through',
  },
  movedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  movedText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  skippedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs + 2,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
  },
  skipButton: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  skipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    padding: spacing.xl,
    fontSize: fontSize.sm,
  },
});
