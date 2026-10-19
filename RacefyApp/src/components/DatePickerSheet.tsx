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
  mode?: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
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
  onConfirm,
  onCancel,
}: DatePickerSheetProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);

  // Re-seed the draft every time the sheet opens.
  useEffect(() => {
    if (visible) setDraft(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (Platform.OS !== 'ios') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
        is24Hour
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={(event: DateTimePickerEvent, selected?: Date) => {
          if (event.type === 'set' && selected) onConfirm(selected);
          else onCancel();
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
});
