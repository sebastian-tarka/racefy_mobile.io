import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../../theme';

type Choice = 'keep' | 'today' | 'other';

interface Props {
  visible: boolean;
  /** The day the session was skipped on, YYYY-MM-DD. */
  skippedOn: string;
  workoutName: string;
  isBusy?: boolean;
  onClose: () => void;
  /** Undefined keeps the session on its own day. */
  onConfirm: (scheduledFor?: string) => void;
  formatDate: (iso: string) => string;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Which day a resumed session should count towards (design: ResumeSessionModal
 * in the web app).
 *
 * "Today" is preselected because the common case is "I meant to do it on
 * Tuesday, I am doing it now" — that should be one tap. Keeping the original
 * day is offered only when it is not today, where the two would mean the same
 * thing.
 */
export function ResumeSessionSheet({
  visible,
  skippedOn,
  workoutName,
  isBusy,
  onClose,
  onConfirm,
  formatDate,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const today = isoDate(new Date());
  const skippedToday = skippedOn === today;

  const [choice, setChoice] = useState<Choice>('today');
  const [otherDate, setOtherDate] = useState<Date>(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setChoice('today');
      setOtherDate(new Date());
      setPickerOpen(false);
    }
  }, [visible]);

  const handleDate = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setPickerOpen(false);
    if (!selected) return;
    setOtherDate(selected);
    setChoice('other');
  };

  const confirm = () => {
    if (choice === 'keep') onConfirm(undefined);
    else if (choice === 'today') onConfirm(today);
    else onConfirm(isoDate(otherDate));
  };

  const options: { id: Choice; label: string; hint?: string }[] = [
    ...(skippedToday
      ? []
      : [
          {
            id: 'keep' as const,
            label: t('strengthPlans.resumeSheet.keep', { date: formatDate(skippedOn) }),
          },
        ]),
    { id: 'today', label: t('strengthPlans.resumeSheet.today') },
    {
      id: 'other',
      label: t('strengthPlans.resumeSheet.other'),
      hint: formatDate(isoDate(otherDate)),
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />

        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
          {t('strengthPlans.resumeSheet.title', { name: workoutName })}
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {t('strengthPlans.resumeSheet.hint')}
        </Text>

        <View style={styles.options}>
          {options.map((option) => {
            const active = choice === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setChoice(option.id);
                  if (option.id === 'other') setPickerOpen(true);
                }}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={active ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
                  {option.label}
                </Text>
                {!!option.hint && (
                  <Text style={[styles.optionHint, { color: colors.textMuted }]}>
                    {option.hint}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {pickerOpen && (
          <DateTimePicker
            value={otherDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDate}
          />
        )}

        <TouchableOpacity
          style={[styles.confirm, { backgroundColor: colors.primary }]}
          onPress={confirm}
          disabled={isBusy}
          activeOpacity={0.85}
        >
          {isBusy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.confirmText}>{t('strengthPlans.resumeSheet.confirm')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,26,20,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  body: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  options: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  optionLabel: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  optionHint: {
    fontSize: fontSize.sm,
  },
  confirm: {
    height: 52,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  confirmText: {
    color: '#ffffff',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
