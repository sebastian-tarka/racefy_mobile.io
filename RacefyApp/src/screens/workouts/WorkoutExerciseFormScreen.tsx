import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, OptionSelector, ScreenContainer, ScreenHeader } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { emitRefresh } from '../../services/refreshEvents';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type {
  Exercise,
  ExerciseReference,
  WorkoutExerciseInput,
  WorkoutTargetType,
} from '../../types/workouts';
import { ExercisePickerModal } from './components/ExercisePickerModal';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutExerciseForm'>;

const TARGET_TYPES: WorkoutTargetType[] = ['reps', 'seconds', 'amrap'];

function toInt(text: string): number | null {
  const n = parseInt(text.replace(',', '.'), 10);
  return Number.isFinite(n) ? n : null;
}

function toFloat(text: string): number | null {
  const n = parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * A prescription: which exercise, how many sets, what target, how much rest.
 * The exercise comes from the picker — a library row or a new name the
 * backend resolves (and creates) on save.
 */
export function WorkoutExerciseFormScreen({ navigation, route }: Props) {
  const { planId, workoutId, workoutExerciseId } = route.params;
  const isEdit = workoutExerciseId != null;
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [exerciseRef, setExerciseRef] = useState<ExerciseReference | null>(null);
  const [exerciseLabel, setExerciseLabel] = useState('');
  const [exerciseTouched, setExerciseTouched] = useState(false);
  const [sets, setSets] = useState(3);
  const [targetType, setTargetType] = useState<WorkoutTargetType>('reps');
  const [repsMin, setRepsMin] = useState('');
  const [repsMax, setRepsMax] = useState('');
  const [rest, setRest] = useState('90');
  const [tempo, setTempo] = useState('');
  const [superset, setSuperset] = useState('');
  const [weight, setWeight] = useState('');
  const [loadNote, setLoadNote] = useState('');
  const [videoOverride, setVideoOverride] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!isEdit) return;
    let mounted = true;
    api
      .getWorkoutPlan(planId)
      .then((plan) => {
        const row = plan.workouts
          ?.find((w) => w.id === workoutId)
          ?.exercises?.find((r) => r.id === workoutExerciseId);
        if (!mounted || !row) {
          navigation.goBack();
          return;
        }
        setExerciseRef({ id: row.exercise.id });
        setExerciseLabel(row.exercise.name);
        setSets(row.sets);
        setTargetType(row.target_type);
        setRepsMin(row.reps_min != null ? String(row.reps_min) : '');
        setRepsMax(row.reps_max != null ? String(row.reps_max) : '');
        setRest(row.rest_seconds != null ? String(row.rest_seconds) : '');
        setTempo(row.tempo ?? '');
        setSuperset(row.superset_group != null ? String(row.superset_group) : '');
        setWeight(row.target_weight_kg != null ? String(row.target_weight_kg) : '');
        setLoadNote(row.load_note ?? '');
        setVideoOverride(row.video_url_override ?? '');
        setNotes(row.notes ?? '');
      })
      .catch((error: any) => {
        logger.error('api', 'Failed to load prescription', {
          workoutExerciseId,
          error: error.message,
        });
        navigation.goBack();
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [isEdit, planId, workoutId, workoutExerciseId, navigation]);

  const onPick = (ref: ExerciseReference, exercise?: Exercise) => {
    setExerciseRef(ref);
    setExerciseLabel(exercise?.name ?? ref.name ?? '');
    setExerciseTouched(true);
    setPickerVisible(false);
  };

  const validate = (): Record<string, string[]> => {
    const e: Record<string, string[]> = {};
    if (!exerciseRef) e.exercise = [t('strengthPlans.errors.exerciseRequired')];
    if (sets < 1 || sets > 20) e.sets = [t('strengthPlans.errors.setsRange')];
    if (targetType !== 'amrap') {
      const lo = toInt(repsMin);
      const hi = toInt(repsMax);
      if (lo != null && hi != null && hi < lo) e.reps_max = [t('strengthPlans.errors.repsOrder')];
    }
    const r = toInt(rest);
    if (rest.trim() && (r == null || r < 0 || r > 3600)) {
      e.rest_seconds = [t('strengthPlans.errors.restRange')];
    }
    return e;
  };

  const submit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length || !exerciseRef) return;

    const base: Omit<WorkoutExerciseInput, 'exercise'> = {
      sets,
      target_type: targetType,
      reps_min: targetType === 'amrap' ? null : toInt(repsMin),
      reps_max: targetType === 'amrap' ? null : toInt(repsMax),
      rest_seconds: rest.trim() ? toInt(rest) : null,
      tempo: tempo.trim() || null,
      superset_group: superset.trim() ? toInt(superset) : null,
      target_weight_kg: weight.trim() ? toFloat(weight) : null,
      load_note: loadNote.trim() || null,
      video_url: videoOverride.trim() || null,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        // Send `exercise` only when the athlete actually swapped it.
        await api.updateWorkoutExercise(workoutExerciseId, {
          ...base,
          ...(exerciseTouched ? { exercise: exerciseRef } : {}),
        });
      } else {
        await api.createWorkoutExercise(workoutId, { ...base, exercise: exerciseRef });
      }
      emitRefresh('workouts');
      navigation.goBack();
    } catch (error: any) {
      if (error.status === 422) setErrors(error.errors || {});
      else Alert.alert('', error.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const isSeconds = targetType === 'seconds';

  return (
    <ScreenContainer edges={['top']}>
      <ScreenHeader
        title={t(
          isEdit ? 'strengthPlans.exerciseForm.titleEdit' : 'strengthPlans.exerciseForm.titleNew',
        )}
        showBack
        onBack={() => navigation.goBack()}
      />
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Exercise picker */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('strengthPlans.exerciseForm.exercise')}
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerRow,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: errors.exercise ? colors.error : colors.border,
                },
              ]}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="barbell-outline"
                size={20}
                color={exerciseRef ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.pickerText,
                  { color: exerciseRef ? colors.textPrimary : colors.textMuted },
                ]}
                numberOfLines={2}
              >
                {exerciseLabel || t('strengthPlans.exerciseForm.pickExercise')}
              </Text>
              <Text style={[styles.pickerAction, { color: colors.primary }]}>
                {exerciseRef
                  ? t('strengthPlans.exerciseForm.swapExercise')
                  : t('strengthPlans.exerciseForm.pickExercise')}
              </Text>
            </TouchableOpacity>
            {errors.exercise && (
              <Text style={[styles.error, { color: colors.error }]}>{errors.exercise[0]}</Text>
            )}

            {/* Sets */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('strengthPlans.exerciseForm.sets')}
            </Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepButton, { borderColor: colors.border }]}
                onPress={() => setSets((s) => Math.max(1, s - 1))}
                accessibilityLabel="−"
              >
                <Ionicons name="remove" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{sets}</Text>
              <TouchableOpacity
                style={[styles.stepButton, { borderColor: colors.border }]}
                onPress={() => setSets((s) => Math.min(20, s + 1))}
                accessibilityLabel="+"
              >
                <Ionicons name="add" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {errors.sets && (
              <Text style={[styles.error, { color: colors.error }]}>{errors.sets[0]}</Text>
            )}

            <OptionSelector<WorkoutTargetType>
              label={t('strengthPlans.exerciseForm.targetType')}
              value={targetType}
              onChange={setTargetType}
              options={TARGET_TYPES.map((v) => ({
                value: v,
                label: t(`strengthPlans.target.${v}`),
              }))}
            />

            {targetType !== 'amrap' && (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input
                    label={t(
                      isSeconds
                        ? 'strengthPlans.exerciseForm.secondsMin'
                        : 'strengthPlans.exerciseForm.repsMin',
                    )}
                    value={repsMin}
                    onChangeText={setRepsMin}
                    keyboardType="number-pad"
                    error={errors.reps_min}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label={t(
                      isSeconds
                        ? 'strengthPlans.exerciseForm.secondsMax'
                        : 'strengthPlans.exerciseForm.repsMax',
                    )}
                    value={repsMax}
                    onChangeText={setRepsMax}
                    keyboardType="number-pad"
                    error={errors.reps_max}
                  />
                </View>
              </View>
            )}

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('strengthPlans.exerciseForm.rest')}
                  value={rest}
                  onChangeText={setRest}
                  keyboardType="number-pad"
                  error={errors.rest_seconds}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('strengthPlans.exerciseForm.weight')}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  error={errors.target_weight_kg}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('strengthPlans.exerciseForm.tempo')}
                  value={tempo}
                  onChangeText={setTempo}
                  placeholder={t('strengthPlans.exerciseForm.tempoPlaceholder')}
                  error={errors.tempo}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('strengthPlans.exerciseForm.superset')}
                  value={superset}
                  onChangeText={setSuperset}
                  keyboardType="number-pad"
                  error={errors.superset_group}
                />
              </View>
            </View>

            <Input
              label={t('strengthPlans.exerciseForm.loadNote')}
              value={loadNote}
              onChangeText={setLoadNote}
              placeholder={t('strengthPlans.exerciseForm.loadNotePlaceholder')}
              maxLength={150}
              error={errors.load_note}
            />
            <Input
              label={t('strengthPlans.exerciseForm.videoOverride')}
              value={videoOverride}
              onChangeText={setVideoOverride}
              placeholder="https://youtu.be/…"
              keyboardType="url"
              autoCapitalize="none"
              error={errors.video_url}
            />
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {t('strengthPlans.exerciseForm.videoHint')}
            </Text>
            <Input
              label={t('strengthPlans.exerciseForm.notes')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              error={errors.notes}
            />

            <Button
              title={t('strengthPlans.exerciseForm.save')}
              onPress={submit}
              loading={submitting}
              fullWidth
              style={{ marginTop: spacing.md }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <ExercisePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={onPick}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  pickerText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  pickerAction: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  error: {
    fontSize: fontSize.xs,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 40,
    textAlign: 'center',
    fontSize: fontSize.xxl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hint: {
    fontSize: fontSize.xs,
    marginTop: -spacing.xs,
  },
});
