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
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, ScreenContainer, ScreenHeader } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { emitRefresh } from '../../services/refreshEvents';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { Weekday } from '../../types/workouts';
import { WEEKDAYS } from '../../types/workouts';
import { weekdayShort } from '../../utils/workoutPlanFormat';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutForm'>;

/** Name, day label, weekday, focus, notes. Exercises live on the workout screen. */
export function WorkoutFormScreen({ navigation, route }: Props) {
  const { planId, workoutId } = route.params;
  const isEdit = workoutId != null;
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [dayLabel, setDayLabel] = useState('');
  const [weekday, setWeekday] = useState<Weekday | null>(null);
  const [focus, setFocus] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!isEdit) return;
    let mounted = true;
    api
      .getWorkoutPlan(planId)
      .then((plan) => {
        const w = plan.workouts?.find((x) => x.id === workoutId);
        if (!mounted || !w) {
          navigation.goBack();
          return;
        }
        setName(w.name);
        setDayLabel(w.day_label ?? '');
        setWeekday(w.weekday);
        setFocus(w.focus ?? '');
        setNotes(w.notes ?? '');
      })
      .catch((error: any) => {
        logger.error('api', 'Failed to load workout for edit', { workoutId, error: error.message });
        navigation.goBack();
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [isEdit, planId, workoutId, navigation]);

  const submit = async () => {
    setErrors({});
    if (!name.trim()) {
      setErrors({ name: [t('strengthPlans.errors.nameRequired')] });
      return;
    }
    const payload = {
      name: name.trim(),
      day_label: dayLabel.trim() || null,
      weekday,
      focus: focus.trim() || null,
      notes: notes.trim() || null,
    };
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.updateWorkout(workoutId, payload);
        emitRefresh('workouts');
        navigation.goBack();
      } else {
        const w = await api.createWorkout(planId, payload);
        emitRefresh('workouts');
        navigation.replace('WorkoutDetail', { planId, workoutId: w.id });
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
        title={t(
          isEdit ? 'strengthPlans.workoutForm.titleEdit' : 'strengthPlans.workoutForm.titleNew',
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
            <Input
              label={t('strengthPlans.workoutForm.name')}
              value={name}
              onChangeText={setName}
              placeholder={t('strengthPlans.workoutForm.namePlaceholder')}
              error={errors.name}
              maxLength={200}
            />
            <Input
              label={t('strengthPlans.workoutForm.dayLabel')}
              value={dayLabel}
              onChangeText={setDayLabel}
              placeholder={t('strengthPlans.workoutForm.dayLabelPlaceholder')}
              error={errors.day_label}
            />

            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('strengthPlans.workoutForm.weekday')}
            </Text>
            <View style={styles.weekRow}>
              {WEEKDAYS.map((day) => {
                const active = weekday === day;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: active ? colors.primary : colors.cardBackground,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setWeekday(active ? null : day)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        { color: active ? '#ffffff' : colors.textPrimary },
                      ]}
                    >
                      {weekdayShort(day, t)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text
              style={[styles.hint, { color: errors.weekday ? colors.error : colors.textMuted }]}
            >
              {errors.weekday?.[0] ?? (weekday ? '' : t('strengthPlans.noWeekday'))}
            </Text>

            <Input
              label={t('strengthPlans.workoutForm.focus')}
              value={focus}
              onChangeText={setFocus}
              placeholder={t('strengthPlans.workoutForm.focusPlaceholder')}
              error={errors.focus}
            />
            <Input
              label={t('strengthPlans.workoutForm.notes')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              error={errors.notes}
            />

            <Button
              title={t('strengthPlans.workoutForm.save')}
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
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  dayChipText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  hint: {
    fontSize: fontSize.xs,
  },
});
