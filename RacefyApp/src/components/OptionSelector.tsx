import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';

export interface OptionItem<T = string> {
  value: T;
  label: string;
}

export interface OptionSelectorProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: OptionItem<T>[];
  disabled?: boolean;
  label?: string;
  showLabel?: boolean;
  containerStyle?: ViewStyle;
  testID?: string;
}

export function OptionSelector<T = string>({
  value,
  onChange,
  options,
  disabled = false,
  label,
  showLabel = true,
  containerStyle,
  testID,
}: OptionSelectorProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, disabled && { opacity: 0.6 }, containerStyle]} testID={testID}>
      {showLabel && label && (
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      )}
      <View style={styles.optionsRow}>
        {options.map((option, index) => {
          const isSelected = value === option.value;
          return (
            <TouchableOpacity
              key={`${option.value}-${index}`}
              style={[
                styles.option,
                { backgroundColor: colors.background, borderColor: colors.border },
                isSelected && {
                  backgroundColor: disabled ? colors.textMuted : colors.primary,
                  borderColor: disabled ? colors.textMuted : colors.primary,
                },
              ]}
              onPress={() => !disabled && onChange(option.value)}
              disabled={disabled}
              testID={testID ? `${testID}-option-${option.value}` : undefined}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: colors.textSecondary },
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {option.label}
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
  optionText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
});