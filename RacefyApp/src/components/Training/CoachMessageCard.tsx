import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { CoachMessage } from '../../types/api';

interface Props {
  message: CoachMessage;
}

function getIconForKey(key: string): string {
  if (key.startsWith('compliance_high')) return '\u{1F4AA}';
  if (key.startsWith('compliance_low')) return '\u{1F3AF}';
  if (key.startsWith('trend_improving')) return '\u{1F4C8}';
  if (key.startsWith('trend_declining')) return '\u{1F4C9}';
  if (key.startsWith('consistency')) return '\u{2705}';
  if (key.startsWith('distance')) return '\u{1F3C3}';
  if (key.startsWith('duration')) return '\u{23F1}';
  if (key.startsWith('missed')) return '\u{1F4DD}';
  return '\u{1F4AC}';
}

export function CoachMessageCard({ message }: Props) {
  const { colors } = useTheme();
  const icon = getIconForKey(message.key);

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.text, { color: colors.textPrimary }]}>
        {message.message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 20,
  },
  text: {
    flex: 1,
    fontSize: fontSize.md,
    lineHeight: 20,
  },
});
