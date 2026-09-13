import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { heroColors, msFont } from '../../theme';

interface Props {
  /** Places gained since the previously seen rank. Positive = moved up. */
  delta: number | null;
  size?: 'sm' | 'md';
  onDark?: boolean;
}

/**
 * Direction of travel in a ranking (design "Racefy v2" → RankDelta).
 *
 * Neutral dash when there is no history: the delta is derived on the client
 * from the last rank it saw, so the first visit of a period has nothing to
 * compare against and must not pretend otherwise.
 */
export function RankDelta({ delta, size = 'md', onDark = false }: Props) {
  const { colors } = useTheme();
  const small = size === 'sm';

  if (delta == null || delta === 0) {
    return (
      <Text
        style={[
          styles.flat,
          {
            fontSize: msFont(small ? 10.5 : 11.5),
            color: onDark ? heroColors.inkSoft : colors.textMuted,
          },
        ]}
      >
        —
      </Text>
    );
  }

  const up = delta > 0;
  const tint = onDark
    ? up
      ? heroColors.primary
      : '#fca5a5'
    : up
      ? colors.primaryDark
      : colors.error;

  return (
    <View style={styles.row}>
      <Ionicons name={up ? 'chevron-up' : 'chevron-down'} size={small ? 13 : 15} color={tint} />
      <Text style={[styles.value, { fontSize: msFont(small ? 11 : 12.5), color: tint }]}>
        {Math.abs(delta)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  value: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  flat: {
    fontWeight: '600',
  },
});
