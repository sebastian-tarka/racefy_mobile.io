import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useTrainingReminders } from '../../hooks/useTrainingReminders';
import { triggerHaptic } from '../../hooks/useHaptics';
import { emitRefresh } from '../../services/refreshEvents';
import { ScreenHeader, ScreenContainer, Loading } from '../../components';
import { DayPicker } from '../../components/settings/DayPicker';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainingReminders'>;

export function TrainingRemindersScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const {
    enabled,
    days,
    time,
    pushEnabled,
    loading,
    saving,
    toggleEnabled,
    toggleDay,
    setTime,
    togglePush,
  } = useTrainingReminders();

  const [showTimePicker, setShowTimePicker] = useState(false);

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('settings.trainingReminders.title')}
          showBack
          onBack={() => { emitRefresh('training'); navigation.goBack(); }}
        />
        <Loading />
      </ScreenContainer>
    );
  }

  const [hours, minutes] = time.split(':').map(Number);
  const timeDate = new Date();
  timeDate.setHours(hours, minutes, 0, 0);

  const handleTimeChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      const h = selectedDate.getHours().toString().padStart(2, '0');
      const m = selectedDate.getMinutes().toString().padStart(2, '0');
      setTime(`${h}:${m}`);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('settings.trainingReminders.title')}
        showBack
        onBack={() => { emitRefresh('training'); navigation.goBack(); }}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Master Toggle */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
              {t('settings.trainingReminders.remindMe')}
            </Text>
            <Switch
              value={enabled}
              onValueChange={() => {
                triggerHaptic();
                toggleEnabled();
              }}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={enabled ? colors.primary : colors.white}
            />
          </View>
        </View>

        {/* Training Days */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }, !enabled && styles.disabledCard]}>
          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
            {t('settings.trainingReminders.trainingDays')}
          </Text>
          <DayPicker
            selectedDays={days}
            onToggle={toggleDay}
            disabled={!enabled}
          />
        </View>

        {/* Reminder Time */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }, !enabled && styles.disabledCard]}>
          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
            {t('settings.trainingReminders.reminderTime')}
          </Text>
          <TouchableOpacity
            style={[styles.timeButton, { borderColor: colors.border }]}
            onPress={() => {
              if (enabled) {
                triggerHaptic();
                setShowTimePicker(true);
              }
            }}
            disabled={!enabled}
            activeOpacity={0.7}
          >
            <Text style={[styles.timeText, { color: colors.textPrimary }]}>{time}</Text>
            <Ionicons name="time-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={timeDate}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}
          {Platform.OS === 'ios' && showTimePicker && (
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.doneButtonText}>{t('common.done')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Push Notifications Toggle */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }, !enabled && styles.disabledCard]}>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
              {t('settings.trainingReminders.pushNotifications')}
            </Text>
            <Switch
              value={pushEnabled}
              onValueChange={() => {
                if (enabled) {
                  triggerHaptic();
                  togglePush();
                }
              }}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={pushEnabled ? colors.primary : colors.white}
              disabled={!enabled}
            />
          </View>
          {enabled && !pushEnabled && (
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              {t('settings.trainingReminders.pushInfo')}
            </Text>
          )}
        </View>

        {saving && (
          <Text style={[styles.savingText, { color: colors.textMuted }]}>
            {t('common.pleaseWait')}
          </Text>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  disabledCard: {
    opacity: 0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    flex: 1,
    marginRight: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  timeText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  doneButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  infoText: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  savingText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});