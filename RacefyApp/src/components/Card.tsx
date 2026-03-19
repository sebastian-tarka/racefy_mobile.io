import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, borderRadius } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  noPadding?: boolean;
}

export function Card({ children, style, noPadding = false }: CardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        isDark
          ? {
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'rgba(255, 255, 255, 0.06)',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 3,
            }
          : {
              backgroundColor: colors.cardBackground,
              borderColor: 'rgba(0, 0, 0, 0.04)',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            },
        !noPadding && styles.padding,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  padding: {
    padding: spacing.lg,
    paddingBottom: spacing.xs,
  },
});