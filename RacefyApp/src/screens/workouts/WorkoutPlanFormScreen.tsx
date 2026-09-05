import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, ScreenContainer, ScreenHeader } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { emitRefresh } from '../../services/refreshEvents';
import { fontSize, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { ScheduleNotes, WorkoutPlan } from '../../types/workouts';
import { WEEKDAYS } from '../../types/workouts';
import { weekdayLong } from '../../utils/workoutPlanFormat';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutPlanForm'>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Create / edit the plan's own fields. Workouts are added from the plan
 * detail screen; the import screen creates the whole tree in one go.
 */
export function WorkoutPlanFormScreen({ navigation, route }: Props) {
  const planId = route.params?.planId;
  const isEdit = planId != null;
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState<ScheduleNotes>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!isEdit) return;
    let mounted = true;
    api
      .getWorkoutPlan(planId)
      .then((plan: WorkoutPlan) => {
        if (!mounted) return;
        setName(plan.name);
        setDescription(plan.description ?? '');
        setGoal(plan.goal ?? '');
        setStartsOn(plan.starts_on ?? '');
        setEndsOn(plan.ends_on ?? '');
        setScheduleNotes(plan.schedule_notes ?? {});
      })
      .catch((error: any) => {
        logger.error('api', 'Failed to load plan for edit', { planId, error: error.message });
        navigation.goBack();
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [isEdit, planId, navigation]);

  const submit = async () => {
    setErrors({});
    if (!name.trim()) {
      setErrors({ name: [t('strengthPlans.errors.nameRequired')] });
      return;
    }
    const dates: Record<string, string[]> = {};
    if (startsOn && !DATE_RE.test(startsOn)) dates.starts_on = ['YYYY-MM-DD'];
    if (endsOn && !DATE_RE.test(endsOn)) dates.ends_on = ['YYYY-MM-DD'];
    if (Object.keys(dates).length) {
      setErrors(dates);
      return;
    }
    const notes: ScheduleNotes = {};
    for (const day of WEEKDAYS) {
      const text = scheduleNotes[`${day}`]?.trim();
      if (text) notes[`${day}`] = text;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      goal: goal.trim() || null,
      starts_on: startsOn || null,
      ends_on: endsOn || null,
      schedule_notes: notes,
    };
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.updateWorkoutPlan(planId, payload);
        emitRefresh('workouts');
        navigation.goBack();
      } else {
        const plan = await api.createWorkoutPlan(payload);
        emitRefresh('workouts');
        navigation.replace('WorkoutPlanDetail', { planId: plan.id });
      }
    } catch (error: any) {
      if (error.status === 422) setErrors(error.errors || {});
      else Alert.alert('', error.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={['top']}>
      <ScreenHeader
        title={t(isEdit ? 'strengthPlans.planForm.titleEdit' : 'strengthPlans.planForm.titleNew')}
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
            <Input
              label={t('strengthPlans.planForm.name')}
              value={name}
              onChangeText={setName}
              placeholder={t('strengthPlans.planForm.namePlaceholder')}
              error={errors.name}
              maxLength={200}
            />
            <Input
              label={t('strengthPlans.planForm.goal')}
              value={goal}
              onChangeText={setGoal}
              placeholder={t('strengthPlans.planForm.goalPlaceholder')}
              error={errors.goal}
            />
            <Input
              label={t('strengthPlans.planForm.description')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              error={errors.description}
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('strengthPlans.planForm.startsOn')}
                  value={startsOn}
                  onChangeText={setStartsOn}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                  error={errors.starts_on}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('strengthPlans.planForm.endsOn')}
                  value={endsOn}
                  onChangeText={setEndsOn}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                  error={errors.ends_on}
                />
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('strengthPlans.planForm.scheduleNotes')}
            </Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {t('strengthPlans.planForm.scheduleNotesHint')}
            </Text>
            {WEEKDAYS.map((day) => (
              <Input
                key={day}
                label={weekdayLong(day, t)}
                value={scheduleNotes[`${day}`] ?? ''}
                onChangeText={(text) => setScheduleNotes((prev) => ({ ...prev, [`${day}`]: text }))}
                placeholder={t('strengthPlans.restDay')}
              />
            ))}

            <Button
              title={t('strengthPlans.planForm.save')}
              onPress={submit}
              loading={submitting}
              fullWidth
              style={{ marginTop: spacing.md }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  hint: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
});
