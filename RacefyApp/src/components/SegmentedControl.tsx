import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Denser variant for a switch that sits inside a card. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A row of mutually exclusive choices in one sunken track (design "Racefy v2" →
 * SegRowSm).
 *
 * Chosen over a row of outlined pills wherever the options are a closed set the
 * whole screen depends on — the track says "one of these is always on", which a
 * row of separate pills does not.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  compact,
  style,
}: Props<T>) {
  const { colors } = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: colors.background }, style]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.segment,
              compact && styles.segmentCompact,
              active && { backgroundColor: colors.cardBackground, ...styles.segmentActive },
            ]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.label,
                compact && styles.labelCompact,
                {
                  color: active ? colors.textPrimary : colors.textSecondary,
                  fontWeight: active ? '700' : '600',
                },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    borderRadius: borderRadius.lg,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentCompact: {
    paddingVertical: spacing.xs + 2,
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 1,
  },
  label: {
    fontSize: fontSize.sm,
  },
  labelCompact: {
    fontSize: fontSize.xs,
  },
});
