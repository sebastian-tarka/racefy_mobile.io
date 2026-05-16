import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { Button, Input, OptionSelector, ScreenContainer, ScreenHeader } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { useSubscription } from '../../hooks/useSubscription';
import { useUnits } from '../../hooks/useUnits';
import { useSportTypes } from '../../hooks/useSportTypes';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { emitRefresh } from '../../services/refreshEvents';
import { spacing, fontSize, borderRadius } from '../../theme';
import { inputToSi, inputUnitLabel, siToInput } from '../../utils/goalHelpers';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { GoalMetric, GoalPeriod, UserGoal } from '../../types/goals';

type Props = NativeStackScreenProps<RootStackParamList, 'GoalForm'>;

const ALL_METRICS: GoalMetric[] = ['distance', 'duration', 'elevation', 'activities_count'];
const ALL_PERIODS: GoalPeriod[] = ['week', 'month', 'year'];

export function GoalFormScreen({ navigation, route }: Props) {
  const editingId = route.params?.goalId;
  const isEdit = !!editingId;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { features, tier } = useSubscription();
  const { units } = useUnits();
  const { sportTypes } = useSportTypes();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [existingGoal, setExistingGoal] = useState<UserGoal | null>(null);

  const [sportTypeId, setSportTypeId] = useState<number | null>(null);
  const [metric, setMetric] = useState<GoalMetric>('distance');
  const [period, setPeriod] = useState<GoalPeriod>('week');
  const [target, setTarget] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isRepeating, setIsRepeating] = useState(true);
  const [datePickerField, setDatePickerField] = useState<'start' | 'end' | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Load existing goal for edit mode
  useEffect(() => {
    if (!editingId) return;
    let mounted = true;
    api
      .getGoal(editingId)
      .then((goal) => {
        if (!mounted) return;
        setExistingGoal(goal);
        setSportTypeId(goal.sport_type_id);
        setMetric(goal.metric);
        setPeriod(goal.period);
        setTarget(String(siToInput(goal.target_value, goal.metric, units).toFixed(1)));
        setStartDate(new Date(goal.start_date));
        setEndDate(goal.end_date ? new Date(goal.end_date) : null);
        setIsRepeating(goal.is_repeating);
      })
      .catch((error: any) => {
        logger.error('api', 'Failed to load goal for edit', { editingId, error: error.message });
        navigation.goBack();
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [editingId, navigation, units]);

  const isFreeLocked = useCallback(
    (option: 'metric' | 'period' | 'sport', value?: string): boolean => {
      if (option === 'metric') {
        return !features.goals_metrics.includes(value as GoalMetric);
      }
      if (option === 'period') {
        if (value === 'week') return !features.goals_period_week;
        if (value === 'month') return !features.goals_period_month;
        if (value === 'year') return !features.goals_period_year;
      }
      if (option === 'sport') {
        return !features.goals_per_sport_type;
      }
      return false;
    },
    [features]
  );

  const handleLockedTap = useCallback(
    () => {
      navigation.navigate('Paywall', { feature: 'training_goals' });
    },
    [navigation]
  );

  const handleSelectMetric = (value: GoalMetric) => {
    if (isFreeLocked('metric', value)) {
      handleLockedTap();
      return;
    }
    setMetric(value);
  };

  const handleSelectPeriod = (value: GoalPeriod) => {
    if (isFreeLocked('period', value)) {
      handleLockedTap();
      return;
    }
    setPeriod(value);
  };

  const handleSelectSport = (id: number | null) => {
    if (id !== null && isFreeLocked('sport')) {
      handleLockedTap();
      return;
    }
    setSportTypeId(id);
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setDatePickerField(null);
    if (!selectedDate) return;
    if (datePickerField === 'start') setStartDate(selectedDate);
    else if (datePickerField === 'end') setEndDate(selectedDate);
  };

  const handleSubmit = async () => {
    setFieldErrors({});
    const value = parseFloat(target.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setFieldErrors({ target_value: [t('goals.errors.targetTooLow')] });
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && existingGoal) {
        await api.updateGoal(existingGoal.id, {
          target_value: inputToSi(value, metric, units),
          end_date: endDate ? endDate.toISOString().slice(0, 10) : null,
          is_repeating: isRepeating,
        });
      } else {
        await api.createGoal({
          sport_type_id: sportTypeId,
          period,
          metric,
          target_value: inputToSi(value, metric, units),
          start_date: startDate.toISOString().slice(0, 10),
          end_date: endDate ? endDate.toISOString().slice(0, 10) : null,
          is_repeating: isRepeating,
        });
      }
      emitRefresh('goals');
      navigation.goBack();
    } catch (error: any) {
      if (error.status === 403) {
        const feature: string | undefined = error.feature;
        if (feature === 'goals_max_active') {
          Alert.alert(
            t('goals.limitReached.title'),
            t('goals.limitReached.body', { max: error.limit?.limit ?? features.goals_max_active }),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('goals.limitReached.cta'),
                onPress: () => navigation.navigate('Paywall', { feature: 'training_goals' }),
              },
            ]
          );
        } else {
          Alert.alert(
            t('goals.errors.upgradeRequired', { tier }),
            error.message || '',
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('insights.locked.upgrade'),
                onPress: () => navigation.navigate('Paywall', { feature: 'training_goals' }),
              },
            ]
          );
        }
      } else if (error.status === 422) {
        setFieldErrors(error.errors || {});
      } else {
        Alert.alert('', error.message || t('common.error'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const metricOptions = ALL_METRICS.map((m) => ({
    value: m,
    label: `${t(`goals.metric.${m}`)}${isFreeLocked('metric', m) ? ' 🔒' : ''}`,
  }));
  const periodOptions = ALL_PERIODS.map((p) => ({
    value: p,
    label: `${t(`goals.period.${p}`)}${isFreeLocked('period', p) ? ' 🔒' : ''}`,
  }));

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={isEdit ? t('goals.actions.edit') : t('goals.actions.create')}
          showBack
          onBack={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title={isEdit ? t('goals.actions.edit') : t('goals.actions.create')}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Sport — disabled in edit mode (immutable) */}
        {!isEdit && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{t('goals.form.sport')}</Text>
            <View style={styles.sportRow}>
              <TouchableOpacity
                style={[
                  styles.sportChip,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  sportTypeId === null && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => handleSelectSport(null)}
              >
                <Text style={[styles.sportChipText, sportTypeId === null ? styles.sportChipTextSelected : { color: colors.textSecondary }]}>
                  {t('goals.allSports')}
                </Text>
              </TouchableOpacity>
              {sportTypes.map((s) => {
                const isSelected = sportTypeId === s.id;
                const isLocked = isFreeLocked('sport');
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.sportChip,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => handleSelectSport(s.id)}
                  >
                    <Text
                      style={[
                        styles.sportChipText,
                        isSelected ? styles.sportChipTextSelected : { color: colors.textSecondary },
                      ]}
                    >
                      {s.name}{isLocked ? ' 🔒' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {!isEdit && (
          <OptionSelector
            label={t('goals.form.metric')}
            value={metric}
            onChange={handleSelectMetric}
            options={metricOptions}
          />
        )}

        {!isEdit && (
          <OptionSelector
            label={t('goals.form.period')}
            value={period}
            onChange={handleSelectPeriod}
            options={periodOptions}
          />
        )}

        <View style={styles.field}>
          <Input
            label={`${t('goals.form.target')} (${inputUnitLabel(metric, units) || t(`goals.metric.${metric}`)})`}
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            placeholder="0"
            error={fieldErrors.target_value}
          />
        </View>

        {!isEdit && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{t('goals.form.startDate')}</Text>
            <TouchableOpacity
              style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => setDatePickerField('start')}
            >
              <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                {startDate.toISOString().slice(0, 10)}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>{t('goals.form.endDate')}</Text>
          <TouchableOpacity
            style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setDatePickerField('end')}
          >
            <Text style={[styles.dateText, { color: colors.textPrimary }]}>
              {endDate ? endDate.toISOString().slice(0, 10) : t('common.optional')}
            </Text>
            <View style={styles.endDateActions}>
              {endDate && (
                <TouchableOpacity onPress={() => setEndDate(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.field, styles.switchRow]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{t('goals.rolling')}</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t('goals.form.repeating')}
            </Text>
          </View>
          <Switch
            value={isRepeating}
            onValueChange={setIsRepeating}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        <Button
          title={isEdit ? t('goals.actions.save') : t('goals.actions.create')}
          onPress={handleSubmit}
          loading={submitting}
          variant="primary"
          style={styles.submitButton}
        />
      </ScrollView>

      {datePickerField && (
        <DateTimePicker
          value={(datePickerField === 'start' ? startDate : endDate) || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={datePickerField === 'end' ? startDate : undefined}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  sportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sportChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  sportChipText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  sportChipTextSelected: {
    color: '#FFFFFF',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  dateText: {
    fontSize: fontSize.md,
  },
  endDateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
});
