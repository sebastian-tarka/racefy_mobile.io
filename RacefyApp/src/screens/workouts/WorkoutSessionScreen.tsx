import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, ScreenContainer, ScreenHeader } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';
import { playCue } from '../../services/workout/cues';
import {
  cancelRestEndNotification,
  scheduleRestEndNotification,
} from '../../services/strength/restTimerNotification';
import { borderRadius, fontSize, msFont, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { WorkoutSessionExercise, WorkoutSessionSet } from '../../types/workouts';
import { formatTime } from '../../utils/formatters';
import { formatTarget } from '../../utils/workoutPlanFormat';
import { CompleteSessionSheet } from './components/CompleteSessionSheet';
import { ExerciseHistoryModal } from './components/ExerciseHistoryModal';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutSession'>;

type Draft = { weight: string; reps: string };

function num(text: string): number | null {
  const n = parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Screen B — the live checklist. Stopwatch from `started_at`, one expanded
 * exercise (the one holding the next open set), set rows with weight and
 * reps / seconds, Start → Done, a rest countdown with cue + vibration +
 * notification, "+ set", history per exercise, finish or skip.
 */
export function WorkoutSessionScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  useKeepAwake();

  const onError = useCallback((message: string) => Alert.alert('', message), []);
  const s = useWorkoutSession(sessionId, onError);
  const { session, rest, restRemaining, activeSetId } = s;

  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [history, setHistory] = useState<{ id: number; name: string } | null>(null);
  const [result, setResult] = useState<{ activityId: number | null } | null>(null);

  const inProgress = session?.status === 'in_progress';

  // Which exercise is open: the one with the next set, unless the athlete tapped another.
  const activeOrder =
    session?.exercises?.find((ex) => ex.sets.some((x) => x.id === activeSetId))?.exercise_order ??
    null;
  const lastActiveOrderRef = useRef<number | null>(null);
  useEffect(() => {
    if (activeOrder !== lastActiveOrderRef.current) {
      lastActiveOrderRef.current = activeOrder;
      setExpandedOrder(activeOrder);
    }
  }, [activeOrder]);

  // Rest: schedule the safety-net notification when it starts, cue when it ends.
  const restEndsAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!rest) {
      restEndsAtRef.current = null;
      void cancelRestEndNotification();
      return;
    }
    if (restEndsAtRef.current === rest.endsAt) return;
    restEndsAtRef.current = rest.endsAt;
    const nextEx = session?.exercises?.find((ex) => ex.sets.some((x) => x.id === activeSetId));
    void scheduleRestEndNotification((rest.endsAt - Date.now()) / 1000, {
      title: t('strengthPlans.session.notification.title'),
      body: t('strengthPlans.session.notification.body', {
        exercise: nextEx?.exercise?.name ?? '',
      }),
    });
  }, [rest, session?.exercises, activeSetId, t]);

  useEffect(() => {
    if (rest && restRemaining === 0) {
      void cancelRestEndNotification();
      void playCue('go');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      s.finishRest(rest.seconds);
    }
    // finishRest is stable per rest; restRemaining ticks once per second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restRemaining]);

  useEffect(() => () => void cancelRestEndNotification(), []);

  const draftFor = (set: WorkoutSessionSet): Draft =>
    drafts[set.id] ?? {
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

  const setDraft = (setId: number, patch: Partial<Draft>, base: Draft) =>
    setDrafts((prev) => ({ ...prev, [setId]: { ...base, ...prev[setId], ...patch } }));

  const openVideo = (url: string) => Linking.openURL(url).catch(() => {});

  const finish = async (input: Parameters<typeof s.complete>[0]) => {
    try {
      const res = await s.complete({ ...input, duration_seconds: s.elapsedSeconds });
      setCompleteOpen(false);
      setResult({ activityId: res.activity_id ?? res.data.activity_id ?? null });
    } catch (error: any) {
      Alert.alert('', error.message || t('common.error'));
    }
  };

  const skipSession = () =>
    Alert.alert('', t('strengthPlans.session.confirmSkip'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('strengthPlans.session.skipSession'),
        style: 'destructive',
        onPress: async () => {
          try {
            await s.skip();
            setResult({ activityId: null });
          } catch (error: any) {
            Alert.alert('', error.message || t('common.error'));
          }
        },
      },
    ]);

  const leave = () => {
    if (inProgress) {
      Alert.alert('', t('strengthPlans.session.leaveHint'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };

  // ── render helpers ────────────────────────────────────────────────────────

  const renderSet = (ex: WorkoutSessionExercise, set: WorkoutSessionSet) => {
    const timed = set.planned.target_type === 'seconds';
    const draft = draftFor(set);
    const isActive = set.id === activeSetId;
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
            value={draft.weight}
            onChangeText={(v) => setDraft(set.id, { weight: v }, draft)}
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
        <View style={styles.inputBox}>
          <TextInput
            value={draft.reps}
            onChangeText={(v) => setDraft(set.id, { reps: v }, draft)}
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

        {set.is_completed ? (
          <TouchableOpacity
            style={[styles.stateButton, { backgroundColor: colors.primary }]}
            onPress={() => inProgress && s.reopenSet(set.id)}
            onLongPress={() =>
              inProgress &&
              Alert.alert('', t('strengthPlans.session.deleteSetConfirm'), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('strengthPlans.session.removeSet'),
                  style: 'destructive',
                  onPress: () => void s.removeSet(set.id),
                },
              ])
            }
            accessibilityLabel={t('strengthPlans.session.undo')}
          >
            <Ionicons name="checkmark" size={18} color="#ffffff" />
          </TouchableOpacity>
        ) : started ? (
          <TouchableOpacity
            style={[styles.stateButton, styles.doneButton, { backgroundColor: colors.primary }]}
            onPress={() =>
              s.completeSet(set.id, {
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
            onPress={() => s.startSet(set.id)}
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
      </View>
    );
  };

  const renderExercise = (ex: WorkoutSessionExercise) => {
    const done = ex.sets.filter((x) => x.is_completed).length;
    const expanded = expandedOrder === ex.exercise_order;
    const isCurrent = activeOrder === ex.exercise_order;
    const target = `${ex.planned.sets} × ${formatTarget(ex.planned.target_type, ex.planned.reps_min, ex.planned.reps_max, t)}${
      ex.planned.rest_seconds
        ? ` · ${ex.planned.rest_seconds} ${t('strengthPlans.session.sec')}`
        : ''
    }`;
    const lastWeight = ex.sets[0]?.planned.suggested_weight_kg;

    return (
      <View
        key={ex.exercise_order}
        style={[
          styles.exercise,
          {
            backgroundColor: colors.cardBackground,
            borderColor: isCurrent ? colors.primary : colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.exerciseHeader}
          onPress={() => setExpandedOrder(expanded ? null : ex.exercise_order)}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.orderBadge,
              { backgroundColor: done === ex.sets.length ? colors.primary : colors.background },
            ]}
          >
            {done === ex.sets.length && ex.sets.length > 0 ? (
              <Ionicons name="checkmark" size={14} color="#ffffff" />
            ) : (
              <Text style={[styles.orderText, { color: colors.textSecondary }]}>
                {ex.exercise_order}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.exerciseName, { color: colors.textPrimary }]} numberOfLines={2}>
              {ex.exercise?.name ?? '—'}
            </Text>
            <Text style={[styles.exerciseMeta, { color: colors.textMuted }]} numberOfLines={1}>
              {target}
              {lastWeight != null
                ? ` · ${t('strengthPlans.session.suggested', { kg: lastWeight })}`
                : ''}
              {!expanded
                ? ` · ${t('strengthPlans.session.collapsedDone', { done, total: ex.sets.length })}`
                : ''}
            </Text>
          </View>
          {ex.video_url ? (
            <TouchableOpacity onPress={() => openVideo(ex.video_url as string)} hitSlop={8}>
              <Ionicons name="logo-youtube" size={20} color={colors.error} />
            </TouchableOpacity>
          ) : null}
          {ex.exercise && (
            <TouchableOpacity
              onPress={() => setHistory({ id: ex.exercise!.id, name: ex.exercise!.name })}
              hitSlop={8}
              accessibilityLabel={t('strengthPlans.session.history')}
            >
              <Ionicons name="stats-chart-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </TouchableOpacity>

        {expanded && (
          <View style={styles.exerciseBody}>
            {(ex.notes || ex.load_note) && (
              <Text style={[styles.exerciseNotes, { color: colors.textSecondary }]}>
                {[ex.load_note, ex.notes].filter(Boolean).join(' · ')}
              </Text>
            )}
            {ex.sets.map((set) => renderSet(ex, set))}
            {inProgress && ex.workout_exercise_id != null && (
              <TouchableOpacity
                style={styles.addSet}
                onPress={() =>
                  void s.addSet({ workout_exercise_id: ex.workout_exercise_id as number })
                }
              >
                <Text style={[styles.addSetText, { color: colors.primary }]}>
                  {t('strengthPlans.session.addSet')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // ── screen ────────────────────────────────────────────────────────────────

  if (s.isLoading || !session) {
    return (
      <ScreenContainer edges={['top']}>
        <ScreenHeader title="" showBack onBack={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (result || session.status !== 'in_progress') {
    const skipped = session.status === 'skipped';
    const activityId = result?.activityId ?? session.activity_id;
    return (
      <ScreenContainer edges={['top']}>
        <ScreenHeader title={session.workout_name} showBack onBack={() => navigation.goBack()} />
        <View style={styles.summary}>
          <Ionicons
            name={skipped ? 'remove-circle-outline' : 'checkmark-circle'}
            size={64}
            color={skipped ? colors.textMuted : colors.primary}
          />
          <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
            {t(
              skipped
                ? 'strengthPlans.complete.skippedTitle'
                : 'strengthPlans.complete.summaryTitle',
            )}
          </Text>
          {!skipped && (
            <View style={styles.summaryStats}>
              <Stat
                label={t('strengthPlans.complete.time')}
                value={formatTime(session.duration_seconds ?? s.elapsedSeconds)}
              />
              <Stat
                label={t('strengthPlans.complete.sets')}
                value={`${session.stats?.sets_completed ?? 0}/${session.stats?.sets_total ?? 0}`}
              />
              <Stat
                label={t('strengthPlans.complete.volume')}
                value={`${Math.round(session.stats?.volume_kg ?? 0)} kg`}
              />
            </View>
          )}
          {activityId != null && (
            <Button
              title={t('strengthPlans.complete.openActivity')}
              onPress={() => navigation.replace('ActivityDetail', { activityId })}
              fullWidth
            />
          )}
          <Button
            title={t('strengthPlans.complete.backToPlan')}
            variant="outline"
            onPress={() => navigation.goBack()}
            fullWidth
          />
        </View>
      </ScreenContainer>
    );
  }

  const stats = session.stats;
  const progress = stats && stats.sets_total > 0 ? stats.sets_completed / stats.sets_total : 0;

  return (
    <ScreenContainer edges={['top']}>
      <ScreenHeader
        title={session.workout_name}
        showBack
        onBack={leave}
        rightAction={
          <Text style={[styles.clock, { color: colors.textPrimary }]}>
            {formatTime(s.elapsedSeconds)}
          </Text>
        }
      />

      {/* Progress */}
      <View style={styles.progressWrap}>
        <View style={styles.progressRow}>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {t('strengthPlans.session.progress', {
              done: stats?.sets_completed ?? 0,
              total: stats?.sets_total ?? 0,
            })}
          </Text>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {t('strengthPlans.session.volume', { kg: Math.round(stats?.volume_kg ?? 0) })}
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: colors.primary, width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>
      </View>

      {/* Rest */}
      {rest && restRemaining != null && restRemaining > 0 && (
        <View
          style={[
            styles.restBar,
            { backgroundColor: colors.warning + '22', borderColor: colors.warning },
          ]}
        >
          <Ionicons name="hourglass-outline" size={18} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.restTitle, { color: colors.textPrimary }]}>
              {t('strengthPlans.session.rest')} ·{' '}
              {t('strengthPlans.session.restLeft', { time: formatTime(restRemaining) })}
            </Text>
            <View style={[styles.restTrack, { backgroundColor: colors.warning + '33' }]}>
              <View
                style={[
                  styles.fill,
                  {
                    backgroundColor: colors.warning,
                    width: `${Math.round((restRemaining / rest.seconds) * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
          <TouchableOpacity onPress={() => s.extendRest(30)} hitSlop={6}>
            <Text style={[styles.restAction, { color: colors.textPrimary }]}>
              {t('strengthPlans.session.plus30')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              void cancelRestEndNotification();
              s.finishRest(rest.seconds - restRemaining);
            }}
            hitSlop={6}
          >
            <Text style={[styles.restAction, { color: colors.warning }]}>
              {t('strengthPlans.session.skipRest')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {session.exercises?.map(renderExercise)}
        <Button
          title={t('strengthPlans.session.finish')}
          onPress={() => setCompleteOpen(true)}
          fullWidth
        />
        <Button
          title={t('strengthPlans.session.skipSession')}
          variant="ghost"
          onPress={skipSession}
          fullWidth
        />
      </ScrollView>

      <CompleteSessionSheet
        visible={completeOpen}
        onClose={() => setCompleteOpen(false)}
        onSubmit={finish}
      />
      <ExerciseHistoryModal
        exerciseId={history?.id ?? null}
        exerciseName={history?.name ?? ''}
        onClose={() => setHistory(null)}
      />
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  clock: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  restBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  restTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  restTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  restAction: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.sm,
  },
  exercise: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  exerciseName: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  exerciseMeta: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  exerciseBody: {
    paddingHorizontal: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
    gap: spacing.xs + 2,
  },
  exerciseNotes: {
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  setNo: {
    width: 44,
  },
  setNoText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  setTarget: {
    fontSize: msFont(9),
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  unit: {
    fontSize: fontSize.xs,
    width: 30,
  },
  stateButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    width: 72,
  },
  stateText: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  addSet: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  addSetText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  summary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  summaryTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  summaryStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginVertical: spacing.sm,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
