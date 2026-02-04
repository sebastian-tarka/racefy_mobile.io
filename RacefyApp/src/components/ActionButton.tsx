import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { useTheme } from '../hooks/useTheme';

interface ActionButtonProps {
  label: string;
  icon: string; // emoji
  backgroundColor: string;
  borderColor: string;
  onPress: () => void;
  style?: ViewStyle;
}

/**
 * ActionButton - Reusable button component with icon and label
 *
 * Used for quick actions in the home screen.
 * Features semi-transparent background, border, emoji icon, and centered layout.
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  icon,
  backgroundColor,
  borderColor,
  onPress,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: fontSize.xl,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
