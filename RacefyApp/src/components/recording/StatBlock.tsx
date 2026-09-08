import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FONT_CAP, fontSize, heroColors, msFont, spacing } from '../../theme';

export type StatBlockSize = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  value: string;
  unit?: string;
  size?: StatBlockSize;
  /** Render on the dark recording ground instead of a themed surface. */
  dark?: boolean;
  /** Paint the number in the brand emerald (used for the leading figure). */
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * "Label + big number + unit" (design: RXStat). Every readout on the recording
 * and summary screens is one of these, which is what makes a 2×2 grid of very
 * different quantities read as one instrument panel.
 *
 * Numbers are tabular so the layout does not jitter while the digits change —
 * the design gets this from Geist Mono, which the app does not bundle.
 */
export function StatBlock({
  label,
  value,
  unit,
  size = 'md',
  dark = false,
  accent = false,
  style,
}: Props) {
  const { colors } = useTheme();
  const valueSize = VALUE_SIZE[size];
  const ink = dark ? heroColors.ink : colors.textPrimary;
  const muted = dark ? heroColors.inkSoft : colors.textMuted;

  return (
    <View style={style}>
      <Text style={[styles.label, { color: muted }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text
          style={[
            styles.value,
            { fontSize: valueSize, lineHeight: valueSize, color: accent ? colors.primary : ink },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        {!!unit && (
          <Text
            style={[
              styles.unit,
              { fontSize: Math.max(fontSize.xs, valueSize * 0.28), color: muted },
            ]}
          >
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}

const VALUE_SIZE: Record<StatBlockSize, number> = {
  sm: msFont(18, FONT_CAP.display),
  md: msFont(26, FONT_CAP.display),
  lg: msFont(38, FONT_CAP.display),
};

const styles = StyleSheet.create({
  label: {
    fontSize: msFont(10),
    fontWeight: '600',
    letterSpacing: 1.6,
    marginBottom: 3,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  value: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  unit: {
    fontWeight: '500',
  },
});
