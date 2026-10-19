import React from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, fontSize, spacing } from '../../../theme';

interface RecordingToastProps {
  /** Driven by useFadeToast / useMapStyleCycler. */
  opacity: Animated.Value;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  iconColor: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
}

/**
 * The pill that floats over the recording screen for a moment (audio coach on/off,
 * lock, map style, offline start, event pin, workout). Never takes touches: it sits
 * over the map and the controls.
 */
export const RecordingToast = React.memo(function RecordingToast({
  opacity,
  icon,
  text,
  iconColor,
  textColor,
  backgroundColor,
  borderColor,
}: RecordingToastProps) {
  return (
    <Animated.View
      style={[styles.toast, { backgroundColor, borderColor, opacity }]}
      pointerEvents="none"
    >
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text style={[styles.text, { color: textColor }]}>{text}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 2000,
  },
  text: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
