import React, { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../theme';
import { formatDate, formatIntlDate } from '../../utils/dateFormat';
import {
  MAX_INTERVAL,
  MonthlyMode,
  RecurrenceEnd,
  RecurrenceForm,
  RecurrenceFrequency,
  weekOfMonth,
} from '../../utils/recurrence';
import { DatePickerSheet } from '../DatePickerSheet';
import { Input } from '../Input';
import { SegmentedControl } from '../SegmentedControl';

interface RecurrenceSectionProps {
  value: RecurrenceForm;
  onChange: (patch: Partial<RecurrenceForm>) => void;
  /** Monthly options and the default weekday are read from it. */
  startsAt: Date;
  /** i18n key from validateRecurrence, or a server message. */
  error?: string | string[] | null;
}

/** Monday first — the app's audience is European. 0 = Sunday, as in the API. */
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];
/** Localized name of weekday `day` — 4 Jan 2026 is a Sunday, so 4 + day lands on it. */
const weekdayName = (day: number, style: 'short' | 'long') =>
  formatIntlDate(new Date(2026, 0, 4 + day), { weekday: style });

/**
 * "Repeat" part of the create-event form → `recurrence` of POST /events
 * (Plus/Pro, gated by the caller). Only what the API can generate: weekly on
 * chosen days, or monthly on the start date's day / nth weekday.
 */
export function RecurrenceSection({ value, onChange, startsAt, error }: RecurrenceSectionProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [isUntilPickerOpen, setIsUntilPickerOpen] = useState(false);
  const errorText = Array.isArray(error) ? error[0] : error;

  const nth = weekOfMonth(startsAt);
  const monthlyOptions = useMemo(
    () => [
      {
        value: 'day_of_month' as MonthlyMode,
        label: t('eventForm.recurrence.monthlyDay', { day: startsAt.getDate() }),
      },
      {
        value: 'weekday' as MonthlyMode,
        label: t('eventForm.recurrence.monthlyWeekday', {
          nth: t(`eventForm.recurrence.nth.${nth === -1 ? 'last' : nth}`),
          weekday: weekdayName(startsAt.getDay(), 'long'),
        }),
      },
    ],
    [t, startsAt, nth],
  );

  const toggleEnabled = (enabled: boolean) =>
    onChange(
      enabled && value.byWeekday.length === 0
        ? { enabled, byWeekday: [startsAt.getDay()] }
        : { enabled },
    );

  const toggleWeekday = (day: number) =>
    onChange({
      byWeekday: value.byWeekday.includes(day)
        ? value.byWeekday.filter((d) => d !== day)
        : [...value.byWeekday, day],
    });

  const unitKey =
    value.frequency === 'weekly'
      ? 'eventForm.recurrence.intervalWeeks'
      : 'eventForm.recurrence.intervalMonths';

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('eventForm.recurrence.title')}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t('eventForm.recurrence.description')}
          </Text>
        </View>
        <Switch
          value={value.enabled}
          onValueChange={toggleEnabled}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>

      {value.enabled && (
        <View style={styles.body}>
          <SegmentedControl<RecurrenceFrequency>
            compact
            options={[
              { value: 'weekly', label: t('eventForm.recurrence.weekly') },
              { value: 'monthly', label: t('eventForm.recurrence.monthly') },
            ]}
            value={value.frequency}
            onChange={(frequency) => onChange({ frequency })}
          />

          {/* Every N weeks / months */}
          <View style={styles.intervalRow}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('eventForm.recurrence.every')}
            </Text>
            <TouchableOpacity
              onPress={() => onChange({ interval: Math.max(1, value.interval - 1) })}
              disabled={value.interval <= 1}
              hitSlop={8}
            >
              <Ionicons
                name="remove-circle-outline"
                size={26}
                color={value.interval <= 1 ? colors.textMuted : colors.primary}
              />
            </TouchableOpacity>
            <Text style={[styles.intervalValue, { color: colors.textPrimary }]}>
              {value.interval}
            </Text>
            <TouchableOpacity
              onPress={() => onChange({ interval: Math.min(MAX_INTERVAL, value.interval + 1) })}
              disabled={value.interval >= MAX_INTERVAL}
              hitSlop={8}
            >
              <Ionicons
                name="add-circle-outline"
                size={26}
                color={value.interval >= MAX_INTERVAL ? colors.textMuted : colors.primary}
              />
            </TouchableOpacity>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t(unitKey, { count: value.interval })}
            </Text>
          </View>

          {value.frequency === 'weekly' ? (
            <View style={styles.weekdays}>
              {WEEKDAYS.map((day) => {
                const active = value.byWeekday.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => toggleWeekday(day)}
                    style={[
                      styles.weekday,
                      {
                        backgroundColor: active ? colors.primary : colors.cardBackground,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={weekdayName(day, 'long')}
                  >
                    <Text
                      style={[
                        styles.weekdayText,
                        { color: active ? colors.white : colors.textPrimary },
                      ]}
                    >
                      {weekdayName(day, 'short')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <SegmentedControl<MonthlyMode>
              compact
              options={monthlyOptions}
              value={value.monthlyMode}
              onChange={(monthlyMode) => onChange({ monthlyMode })}
            />
          )}

          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t('eventForm.recurrence.ends')}
          </Text>
          <SegmentedControl<RecurrenceEnd>
            compact
            options={[
              { value: 'never', label: t('eventForm.recurrence.endNever') },
              { value: 'count', label: t('eventForm.recurrence.endCount') },
              { value: 'until', label: t('eventForm.recurrence.endUntil') },
            ]}
            value={value.end}
            onChange={(end) => onChange({ end })}
          />
          {value.end === 'count' && (
            <Input
              label={t('eventForm.recurrence.countLabel')}
              value={value.count}
              onChangeText={(count) => onChange({ count })}
              keyboardType="number-pad"
              leftIcon="repeat-outline"
            />
          )}
          {value.end === 'until' && (
            <TouchableOpacity
              onPress={() => setIsUntilPickerOpen(true)}
              style={[styles.dateButton, { borderColor: colors.border }]}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              <Text style={{ color: value.until ? colors.textPrimary : colors.textMuted }}>
                {value.until ? formatDate(value.until, 'PP') : t('eventForm.selectDate')}
              </Text>
            </TouchableOpacity>
          )}

          <Input
            label={t('eventForm.recurrence.registrationOpens')}
            placeholder={t('eventForm.recurrence.registrationOpensPlaceholder')}
            value={value.registrationOpensDaysBefore}
            onChangeText={(registrationOpensDaysBefore) =>
              onChange({ registrationOpensDaysBefore })
            }
            keyboardType="number-pad"
            leftIcon="time-outline"
          />

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t('eventForm.recurrence.copiedHint')}
          </Text>
        </View>
      )}

      {!!errorText && (
        <Text style={[styles.error, { color: colors.error }]}>
          {errorText.startsWith('eventForm.') ? t(errorText) : errorText}
        </Text>
      )}

      <DatePickerSheet
        visible={isUntilPickerOpen}
        mode="date"
        value={value.until ?? startsAt}
        minimumDate={startsAt}
        title={t('eventForm.recurrence.endUntil')}
        onConfirm={(until) => {
          onChange({ until });
          setIsUntilPickerOpen(false);
        }}
        onCancel={() => setIsUntilPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  description: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  body: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  intervalValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  weekdays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  weekday: {
    minWidth: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  error: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
});
