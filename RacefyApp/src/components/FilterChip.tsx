import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { msFont } from '../theme';

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

/** One pill of a single-choice filter row (rewards, point history). Lay them out yourself. */
export const FilterChip = React.memo(function FilterChip({
  label,
  active,
  onPress,
}: FilterChipProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.textPrimary : 'transparent',
          borderColor: active ? colors.textPrimary : colors.border,
        },
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.text, { color: active ? colors.white : colors.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontSize: msFont(12),
    fontWeight: '600',
  },
});
