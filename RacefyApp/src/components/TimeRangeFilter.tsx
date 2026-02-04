import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';

export type TimeRange = 'week' | 'month' | 'year' | 'all_time';

export interface PeriodOption<T = string> {
  value: T;
  labelKey: string;
}

interface TimeRangeFilterProps<T = string> {
  options: PeriodOption<T>[];
  selectedValue: T;
  onSelectValue: (value: T) => void;
  isLoading?: boolean;
}

export function TimeRangeFilter<T extends string = string>({
  options,
  selectedValue,
  onSelectValue,
  isLoading = false,
}: TimeRangeFilterProps<T>) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {options.map((option) => {
          const isSelected = selectedValue === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.rangeButton,
                { backgroundColor: colors.background, borderColor: colors.border },
                isSelected && {
                  backgroundColor: colors.primary + '15',
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => onSelectValue(option.value)}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.rangeText,
                  { color: colors.textSecondary },
                  isSelected && { color: colors.primary },
                ]}
              >
                {t(option.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  rangeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  rangeText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});