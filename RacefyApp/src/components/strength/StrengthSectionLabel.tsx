import React from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { fontSize, fontWeight } from '../../theme';

/** Small uppercase caption above a strength panel ("SERIE", "PODNIESIONE ŁĄCZNIE"). */
export function StrengthSectionLabel({ children, style }: { children: string; style?: TextStyle }) {
  const { colors } = useTheme();
  return (
    <Text
      style={[styles.label, { color: colors.textSecondary }, style]}
      numberOfLines={1}
      accessibilityRole="header"
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
