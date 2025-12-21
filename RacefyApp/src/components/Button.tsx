import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      ...styles.button,
      opacity: disabled || loading ? 0.6 : 1,
    };

    if (fullWidth) {
      base.width = '100%';
    }

    switch (variant) {
      case 'primary':
        return { ...base, backgroundColor: colors.primary };
      case 'secondary':
        return { ...base, backgroundColor: colors.borderLight };
      case 'outline':
        return {
          ...base,
          backgroundColor: colors.transparent,
          borderWidth: 1,
          borderColor: colors.primary,
        };
      case 'danger':
        return { ...base, backgroundColor: colors.error };
      case 'ghost':
        return { ...base, backgroundColor: colors.transparent };
      default:
        return base;
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return { ...styles.text, color: colors.white };
      case 'secondary':
        return { ...styles.text, color: colors.textPrimary };
      case 'outline':
        return { ...styles.text, color: colors.primary };
      case 'ghost':
        return { ...styles.text, color: colors.textSecondary };
      default:
        return styles.text;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' ? colors.primary : colors.white}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  text: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
