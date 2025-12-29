import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type ThemeColors } from '../hooks/useTheme';
import { spacing, borderRadius, fontSize } from '../theme';

type BadgeVariant =
  | 'upcoming'
  | 'ongoing'
  | 'completed'
  | 'cancelled'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'all_levels';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const getVariantStyles = (colors: ThemeColors): Record<
  BadgeVariant,
  { backgroundColor: string; color: string }
> => ({
  upcoming: { backgroundColor: colors.upcoming.bg, color: colors.upcoming.text },
  ongoing: { backgroundColor: colors.ongoing.bg, color: colors.ongoing.text },
  completed: {
    backgroundColor: colors.completed.bg,
    color: colors.completed.text,
  },
  cancelled: {
    backgroundColor: colors.cancelled.bg,
    color: colors.cancelled.text,
  },
  beginner: { backgroundColor: '#dcfce7', color: '#166534' },
  intermediate: { backgroundColor: '#fef3c7', color: '#92400e' },
  advanced: { backgroundColor: '#fee2e2', color: '#991b1b' },
  all_levels: { backgroundColor: '#e0e7ff', color: '#3730a3' },
});

export function Badge({ label, variant = 'upcoming' }: BadgeProps) {
  const { colors } = useTheme();
  const variantStyles = getVariantStyles(colors);
  const style = variantStyles[variant];

  return (
    <View style={[styles.badge, { backgroundColor: style.backgroundColor }]}>
      <Text style={[styles.text, { color: style.color }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
