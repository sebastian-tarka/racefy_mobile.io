import React from 'react';
import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../../theme';

interface Props {
  title: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
}

/**
 * The dashed "add one more" button that closes every list in the strength
 * screens (design "Racefy v2" → GhostBtn).
 *
 * Dashed rather than solid on purpose: it is the end of a list, not a call to
 * action competing with "Start workout" at the top of the same screen.
 */
export function GhostButton({ title, onPress, icon = 'add', style }: Props) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.button, { borderColor: colors.primary }, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={17} color={colors.primary} />
      <Text style={[styles.text, { color: colors.primary }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  text: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
