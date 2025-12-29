import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';

type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';

interface DifficultySelectorProps {
  value: DifficultyLevel;
  onChange: (difficulty: DifficultyLevel) => void;
}

const DIFFICULTY_OPTIONS: DifficultyLevel[] = [
  'all_levels',
  'beginner',
  'intermediate',
  'advanced',
];

export function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{t('eventForm.difficulty')}</Text>
      <View style={styles.optionsRow}>
        {DIFFICULTY_OPTIONS.map((option) => {
          const isSelected = value === option;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                { backgroundColor: colors.background, borderColor: colors.border },
                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => onChange(option)}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: colors.textSecondary },
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {t(`difficulty.${option}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  optionSelected: {
    // styles applied inline
  },
  optionText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
});
