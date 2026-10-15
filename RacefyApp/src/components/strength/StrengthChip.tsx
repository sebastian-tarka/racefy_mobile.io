import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontFamily, fontSize, fontWeight, spacing } from '../../theme';

/**
 * Amber "record" chip: "↑ Wiosłowanie sztangą +5 kg", "+5 kg vs plan".
 * `label` truncates, `value` (mono) never does.
 */
export function StrengthChip({
  label,
  value,
  arrow,
  style,
}: {
  label?: string;
  value: string;
  arrow?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const tint = { color: colors.warningStrong };
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: colors.warningLight, borderColor: colors.warning + '55' },
        style,
      ]}
    >
      {arrow && (
        <Text
          style={[styles.text, tint]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          ↑
        </Text>
      )}
      {label ? (
        <Text style={[styles.text, styles.label, tint]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      <Text style={[styles.text, styles.value, tint]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  label: {
    flexShrink: 1,
  },
  value: {
    fontFamily: fontFamily.mono,
  },
});
