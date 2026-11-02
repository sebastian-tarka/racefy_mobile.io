import React from 'react';
import { Modal, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, TimeZoneList } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { fontSize, spacing } from '../../../theme';
import { type TimeZoneChoice, getDeviceTimeZone } from '../../../utils/timezone';

interface Props {
  visible: boolean;
  timezone: string;
  timezoneAuto: boolean;
  disabled?: boolean;
  onChoose: (choice: TimeZoneChoice) => void;
  onClose: () => void;
}

/**
 * "Time zone": automatic (the phone's zone, sent with every request) or a
 * zone picked by hand from a searchable IANA list. Reminders, e-mails and
 * what counts as "today" in stats and goals follow it.
 */
export function TimeZoneModal({
  visible,
  timezone,
  timezoneAuto,
  disabled,
  onChoose,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const deviceZone = getDeviceTimeZone();
  const selected = timezoneAuto ? (deviceZone ?? timezone) : timezone || deviceZone || 'UTC';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScreenContainer style={styles.container}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('settings.timezone.title')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t('settings.timezone.description')}
        </Text>

        <View style={[styles.autoRow, { borderBottomColor: colors.border }]}>
          <View style={styles.autoText}>
            <Text style={[styles.autoLabel, { color: colors.textPrimary }]}>
              {t('settings.timezone.auto')}
            </Text>
            <Text style={[styles.autoDetected, { color: colors.textSecondary }]}>
              {t('settings.timezone.detected', {
                zone: deviceZone ?? t('settings.timezone.unknown'),
              })}
            </Text>
          </View>
          <Switch
            value={timezoneAuto}
            onValueChange={(value) =>
              onChoose(value ? { auto: true } : { auto: false, zone: selected })
            }
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={timezoneAuto ? colors.primary : colors.cardBackground}
            disabled={disabled}
            accessibilityLabel={t('settings.timezone.auto')}
          />
        </View>

        {!timezoneAuto && (
          <>
            <Text style={[styles.manualLabel, { color: colors.textSecondary }]}>
              {t('settings.timezone.manual')}
            </Text>
            <TimeZoneList
              selected={selected}
              onSelect={(zone) => onChoose({ auto: false, zone })}
              disabled={disabled}
            />
          </>
        )}
      </ScreenContainer>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: { padding: spacing.xs, width: 44 },
  headerSpacer: { width: 44 },
  title: { fontSize: fontSize.lg, fontWeight: '600', flex: 1, textAlign: 'center' },
  description: {
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    lineHeight: 20,
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  autoText: { flex: 1 },
  autoLabel: { fontSize: fontSize.md, fontWeight: '600' },
  autoDetected: { fontSize: fontSize.sm, marginTop: 2 },
  manualLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
