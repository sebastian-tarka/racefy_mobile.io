import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { triggerHaptic } from '../../hooks/useHaptics';
import { spacing, fontSize, fontWeight } from '../../theme';
import type { TrainingDay } from '../../hooks/useTrainingReminders';

interface DayPickerProps {
  selectedDays: TrainingDay[];
  onToggle: (day: TrainingDay) => void;
  disabled?: boolean;
}

const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS_PL = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

export function DayPicker({ selectedDays, onToggle, disabled }: DayPickerProps) {
  const { colors } = useTheme();
  const { i18n } = useTranslation();

  const dayLabels = i18n.language === 'pl' ? DAY_LABELS_PL : DAY_LABELS_EN;

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      {dayLabels.map((label, index) => {
        const day = index as TrainingDay;
        const isSelected = selectedDays.includes(day);

        return (
          <TouchableOpacity
            key={day}
            onPress={() => {
              triggerHaptic();
              onToggle(day);
            }}
            disabled={disabled}
            activeOpacity={0.7}
            style={[
              styles.dayButton,
              {
                backgroundColor: isSelected ? colors.primary : colors.borderLight,
              },
            ]}
          >
            <Text
              style={[
                styles.dayLabel,
                {
                  color: isSelected ? '#ffffff' : colors.textSecondary,
                  fontWeight: isSelected ? fontWeight.bold : fontWeight.medium,
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    fontSize: fontSize.xs,
  },
});