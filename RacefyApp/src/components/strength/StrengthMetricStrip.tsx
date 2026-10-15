import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { fontSize, fontWeight, msFont, spacing } from '../../theme';
import type { StrengthMetric } from './strengthSession';

/**
 * A row of strength metrics — "Czas · Serie 14/20 · Ćwiczenia 4/6 · RPE 5/10".
 * `bar` is the feed card's stats bar (hairline on top); `plain` sits inside a
 * Card on the activity screen. Values shrink to fit rather than wrap.
 */
export function StrengthMetricStrip({
  items,
  variant = 'plain',
}: {
  items: StrengthMetric[];
  variant?: 'bar' | 'plain';
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.row,
        variant === 'bar' && [
          styles.bar,
          { backgroundColor: colors.cardBackground, borderTopColor: colors.border },
        ],
      ]}
    >
      {items.map((item, i) => (
        <React.Fragment key={item.key}>
          {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
          <View
            style={styles.item}
            accessible
            accessibilityLabel={`${item.label}: ${item.value}${item.unit ? ` ${item.unit}` : ''}`}
          >
            <Text
              style={styles.valueLine}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              <Text style={[styles.value, { color: colors.textPrimary }]}>{item.value}</Text>
              {item.unit ? (
                <Text style={[styles.unit, { color: colors.textSecondary }]}>
                  {item.unit.startsWith('/') ? item.unit : ` ${item.unit}`}
                </Text>
              ) : null}
            </Text>
            <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  bar: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  divider: {
    width: 1,
    height: 32,
    marginHorizontal: spacing.xs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  valueLine: {
    textAlign: 'center',
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.3,
  },
  unit: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  label: {
    fontSize: msFont(11),
    fontWeight: fontWeight.medium,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
