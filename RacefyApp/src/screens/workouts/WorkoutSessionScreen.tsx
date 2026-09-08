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
import { borderRadius, fontSize, heroColors, msFont, spacing } from '../../theme';
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
  /**
   * One exercise fills the screen at a time (design "Racefy v2" →
   * StrengthSessionScreen). It follows the next open set on its own; the
   * progress segments in the header let the athlete override that.
   */
  const [currentOrder, setCurrentOrder] = useState<number | null>(null);
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
      setCurrentOrder(activeOrder);
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

  /** Heading for the exercise currently on screen — no accordion, no chevron. */
  const renderExerciseHead = (ex: WorkoutSessionExercise) => {
    const target = `${ex.planned.sets} × ${formatTarget(ex.planned.target_type, ex.planned.reps_min, ex.planned.reps_max, t)}${
      ex.planned.rest_seconds
        ? ` · ${ex.planned.rest_seconds} ${t('strengthPlans.session.sec')}`
        : ''
    }`;
    const lastWeight = ex.sets[0]?.planned.suggested_weight_kg;

    return (
      <View style={styles.exerciseHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.exerciseName, { color: colors.textPrimary }]}>
            {ex.exercise?.name ?? '—'}
          </Text>
          <Text style={[styles.exerciseTarget, { color: colors.primary }]}>
            {target}
            {lastWeight != null
              ? ` · ${t('strengthPlans.session.suggested', { kg: lastWeight })}`
              : ''}
          </Text>
          {(ex.load_note || ex.notes) && (
            <Text style={[styles.exerciseNotes, { color: colors.textSecondary }]}>
              {[ex.load_note, ex.notes].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>

        <View style={styles.exerciseActions}>
          {ex.video_url ? (
            <TouchableOpacity
              style={[styles.squareButton, { borderColor: colors.border }]}
              onPress={() => openVideo(ex.video_url as string)}
              accessibilityLabel={t('strengthPlans.actions.openVideo')}
            >
              <Ionicons name="logo-youtube" size={20} color={colors.error} />
            </TouchableOpacity>
          ) : null}
          {ex.exercise && (
            <TouchableOpacity
              style={[styles.squareButton, { borderColor: colors.border }]}
              onPress={() => setHistory({ id: ex.exercise!.id, name: ex.exercise!.name })}
              accessibilityLabel={t('strengthPlans.session.history')}
            >
              <Ionicons name="stats-chart-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
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
    const summary: [string, string][] = [
      [
        t('strengthPlans.complete.sets'),
        `${session.stats?.sets_completed ?? 0}/${session.stats?.sets_total ?? 0}`,
      ],
      [t('strengthPlans.complete.volume'), `${Math.round(session.stats?.volume_kg ?? 0)} kg`],
      [t('strengthPlans.complete.time'), formatTime(session.duration_seconds ?? s.elapsedSeconds)],
    ];

    return (
      <ScreenContainer edges={['top']} style={{ backgroundColor: heroColors.bg }}>
        <View style={styles.summaryHero}>
          <View
            style={[
              styles.summaryIcon,
              { backgroundColor: skipped ? heroColors.surfaceStrong : heroColors.primary },
            ]}
          >
            <Ionicons
              name={skipped ? 'remove-circle-outline' : 'checkmark'}
              size={24}
              color="#ffffff"
            />
          </View>
          <Text style={styles.summaryTitle}>
            {t(
              skipped
                ? 'strengthPlans.complete.skippedTitle'
                : 'strengthPlans.complete.summaryTitle',
            )}
          </Text>
          <Text style={styles.summarySubtitle} numberOfLines={2}>
            {session.workout_name}
          </Text>
        </View>

        <View style={[styles.summaryBody, { backgroundColor: colors.background }]}>
          {!skipped && (
            <View style={styles.summaryStats}>
              {summary.map(([label, value]) => (
                <View
                  key={label}
                  style={[
                    styles.summaryCard,
                    { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ flex: 1 }} />

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
  const exercises = session.exercises ?? [];
  const index = Math.max(
    0,
    exercises.findIndex((ex) => ex.exercise_order === currentOrder),
  );
  const current = exercises[index] ?? exercises[0];
  const next = exercises[index + 1];
  const currentDone = current ? current.sets.every((x) => x.is_completed) : false;

  return (
    <ScreenContainer edges={['top']} style={{ backgroundColor: heroColors.bg }}>
      {/* Dark session header: what, how far in, how long, how much moved. */}
      <View style={styles.sessionHeader}>
        <View style={styles.sessionHeaderRow}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={leave}
            accessibilityLabel={t('common.close')}
          >
            <Ionicons name="close" size={18} color={heroColors.ink} />
          </TouchableOpacity>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.sessionName} numberOfLines={1}>
              {session.workout_name}
            </Text>
            <Text style={styles.sessionMeta} numberOfLines={1}>
              {t('strengthPlans.session.exerciseOf', {
                index: index + 1,
                total: exercises.length,
              })}{' '}
              ·{' '}
              {t('strengthPlans.session.progress', {
                done: stats?.sets_completed ?? 0,
                total: stats?.sets_total ?? 0,
              })}
            </Text>
          </View>

          <View style={styles.sessionClockBlock}>
            <Text style={styles.sessionClock}>{formatTime(s.elapsedSeconds)}</Text>
            <Text style={styles.sessionVolume}>
              {t('strengthPlans.session.volume', { kg: Math.round(stats?.volume_kg ?? 0) })}
            </Text>
          </View>
        </View>

        {/* One segment per exercise — how much of each is logged, and a way in. */}
        <View style={styles.segments}>
          {exercises.map((ex) => {
            const done = ex.sets.filter((x) => x.is_completed).length;
            const pct = ex.sets.length ? done / ex.sets.length : 0;
            const isCurrent = ex.exercise_order === current?.exercise_order;
            return (
              <TouchableOpacity
                key={ex.exercise_order}
                style={[
                  styles.segment,
                  {
                    height: isCurrent ? 10 : 6,
                    backgroundColor: isCurrent
                      ? 'rgba(250,250,247,0.32)'
                      : 'rgba(250,250,247,0.18)',
                  },
                ]}
                onPress={() => setCurrentOrder(ex.exercise_order)}
                accessibilityLabel={ex.exercise?.name ?? undefined}
              >
                <View
                  style={[
                    styles.segmentFill,
                    { width: `${Math.round(pct * 100)}%`, backgroundColor: heroColors.primary },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        {/* Rest */}
        {rest && restRemaining != null && restRemaining > 0 && (
          <View style={[styles.restBar, { backgroundColor: colors.warningLight }]}>
            <View style={[styles.restIcon, { backgroundColor: colors.warning }]}>
              <Ionicons name="hourglass-outline" size={17} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.restTitle, { color: colors.warning }]}>
                {t('strengthPlans.session.rest')}
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
            <Text style={[styles.restClock, { color: colors.warning }]}>
              {formatTime(restRemaining)}
            </Text>
            <TouchableOpacity onPress={() => s.extendRest(30)} hitSlop={6}>
              <Text style={[styles.restAction, { color: colors.textSecondary }]}>
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
          {current && renderExerciseHead(current)}

          {/* Column headers make the two number fields unambiguous. */}
          {current && (
            <View style={styles.columns}>
              <Text style={[styles.column, styles.columnNo, { color: colors.textMuted }]}>
                {t('strengthPlans.session.setNo')}
              </Text>
              <Text style={[styles.column, { color: colors.textMuted }]}>
                {t(
                  current.planned.target_type === 'seconds'
                    ? 'strengthPlans.session.sec'
                    : 'strengthPlans.session.reps',
                )}
              </Text>
              <Text style={[styles.column, { color: colors.textMuted }]}>
                {t('strengthPlans.session.kg')}
              </Text>
              <View style={styles.columnAction} />
            </View>
          )}

          {current?.sets.map((set) => renderSet(current, set))}

          {inProgress && current?.workout_exercise_id != null && (
            <TouchableOpacity
              style={[styles.addSet, { borderColor: colors.border }]}
              onPress={() =>
                void s.addSet({ workout_exercise_id: current.workout_exercise_id as number })
              }
            >
              <Ionicons name="add" size={16} color={colors.textSecondary} />
              <Text style={[styles.addSetText, { color: colors.textSecondary }]}>
                {t('strengthPlans.session.addSet')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={skipSession} style={styles.skipSession}>
            <Text style={[styles.skipSessionText, { color: colors.textMuted }]}>
              {t('strengthPlans.session.skipSession')}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Footer: moving on and finishing never scroll out of reach. */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.footerBack,
              { borderColor: colors.border, opacity: index === 0 ? 0.5 : 1 },
            ]}
            onPress={() => setCurrentOrder(exercises[index - 1]?.exercise_order ?? null)}
            disabled={index === 0}
            accessibilityLabel={t('strengthPlans.session.prevExercise')}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          {next ? (
            <TouchableOpacity
              style={[
                styles.footerPrimary,
                { backgroundColor: currentDone ? colors.primary : colors.textPrimary },
              ]}
              onPress={() => setCurrentOrder(next.exercise_order)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.footerPrimaryText, { color: colors.cardBackground }]}
                numberOfLines={1}
              >
                {t('strengthPlans.session.next', { name: next.exercise?.name ?? '' })}
              </Text>
              <Ionicons name="chevron-forward" size={17} color={colors.cardBackground} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.footerPrimary,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
              ]}
              onPress={() => setCompleteOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.footerPrimaryText}>{t('strengthPlans.session.finish')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

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

const styles = StyleSheet.create({
  // ── dark session header ──
  sessionHeader: {
    backgroundColor: heroColors.bg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heroColors.surfaceStrong,
    borderWidth: 1,
    borderColor: heroColors.line,
  },
  sessionName: {
    color: heroColors.ink,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  sessionMeta: {
    color: heroColors.inkSoft,
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  sessionClockBlock: {
    alignItems: 'flex-end',
  },
  sessionClock: {
    color: heroColors.ink,
    fontSize: msFont(19),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  sessionVolume: {
    color: heroColors.inkSoft,
    fontSize: msFont(10),
    fontVariant: ['tabular-nums'],
  },
  segments: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 10,
  },
  segment: {
    flex: 1,
    borderRadius: 5,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  segmentFill: {
    height: '100%',
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  // ── current exercise ──
  exerciseHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
  },
  exerciseTarget: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 3,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  squareButton: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  column: {
    flex: 1,
    fontSize: msFont(10),
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  columnNo: {
    flex: 0,
    width: 44,
  },
  columnAction: {
    width: 52,
  },
  skipSession: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  skipSessionText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  // ── footer ──
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  footerBack: {
    width: 56,
    height: 52,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerPrimary: {
    flex: 1,
    height: 52,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  footerPrimaryText: {
    color: '#ffffff',
    fontSize: fontSize.md,
    fontWeight: '700',
    flexShrink: 1,
  },
  // ── summary ──
  summaryHero: {
    backgroundColor: heroColors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summarySubtitle: {
    color: heroColors.inkSoft,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  summaryBody: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
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
    marginTop: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.lg,
  },
  restIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restClock: {
    fontSize: msFont(20),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
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
  exerciseName: {
    fontSize: fontSize.md,
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    height: 44,
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addSetText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  summaryTitle: {
    color: heroColors.ink,
    fontSize: msFont(24),
    fontWeight: '700',
    letterSpacing: -0.6,
    marginTop: spacing.md,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: spacing.sm,
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
