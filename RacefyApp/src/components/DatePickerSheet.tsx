import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';

interface DatePickerSheetProps {
  visible: boolean;
  value: Date;
  /** 'datetime' is one spinner on iOS and a date dialog followed by a time dialog on Android. */
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  /** Shown between Cancel and Done on iOS (Android dialogs have no title). */
  title?: string;
  /** Called once with the final choice — on Android when the dialog is set, on iOS on "Done". */
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

/**
 * Date/time picker with the same "pick, then confirm" semantics on both platforms.
 *
 * The raw picker differs: Android shows a dialog and fires `onChange` once, while the
 * iOS spinner fires on every wheel tick. Callers that acted on `onChange` therefore
 * committed on the first tick on iOS (and had no way to close the spinner). Here iOS
 * keeps a draft in a bottom sheet and reports it only on "Done".
 */
export function DatePickerSheet({
  visible,
  value,
  mode = 'date',
  minimumDate,
  maximumDate,
  title,
  onConfirm,
  onCancel,
}: DatePickerSheetProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  // Android 'datetime': which of the two dialogs is showing.
  const [androidStep, setAndroidStep] = useState<'date' | 'time'>('date');
  // The Android dialog reads its value once, on mount — so it mounts only after the
  // draft has been re-seeded for this opening, never with the previous one.
  const [seeded, setSeeded] = useState(false);

  // Re-seed the draft every time the sheet opens.
  useEffect(() => {
    if (visible) {
      setDraft(value);
      setAndroidStep('date');
    }
    setSeeded(visible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (Platform.OS !== 'ios') {
    if (!visible || !seeded) return null;
    const step = mode === 'datetime' ? androidStep : mode;
    return (
      <DateTimePicker
        key={step}
        value={draft}
        mode={step}
        display="default"
        is24Hour
        minimumDate={step === 'date' ? minimumDate : undefined}
        maximumDate={step === 'date' ? maximumDate : undefined}
        onChange={(event: DateTimePickerEvent, selected?: Date) => {
          if (event.type !== 'set' || !selected) {
            onCancel();
            return;
          }
          if (mode === 'datetime' && step === 'date') {
            // Keep the time of day, take the picked day; then ask for the time.
            const next = new Date(draft);
            next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
            setDraft(next);
            setAndroidStep('time');
            return;
          }
          if (mode === 'datetime') {
            const next = new Date(draft);
            next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
            onConfirm(next);
            return;
          }
          onConfirm(selected);
        }}
      />
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.container,
                {
                  backgroundColor: colors.cardBackground,
                  paddingBottom: Math.max(insets.bottom, spacing.lg),
                },
              ]}
            >
              <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={onCancel} hitSlop={8}>
                  <Text style={[styles.action, { color: colors.textSecondary }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                {title ? (
                  <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                    {title}
                  </Text>
                ) : null}
                <TouchableOpacity onPress={() => onConfirm(draft)} hitSlop={8}>
                  <Text style={[styles.action, styles.done, { color: colors.primary }]}>
                    {t('common.done')}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={draft}
                mode={mode}
                display="spinner"
                is24Hour
                themeVariant={isDark ? 'dark' : 'light'}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(_event: DateTimePickerEvent, selected?: Date) => {
                  if (selected) setDraft(selected);
                }}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  action: {
    fontSize: fontSize.md,
  },
  done: {
    fontWeight: '600',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: '600',
    marginHorizontal: spacing.md,
  },
});
