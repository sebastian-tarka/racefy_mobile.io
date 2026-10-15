import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { fontSize, spacing } from '../../theme';
import type { StrengthSessionSummary } from '../../types/api';
import { StrengthExerciseCards } from './StrengthExerciseCards';
import { StrengthProgressCard } from './StrengthProgressCard';
import { StrengthVolumeCard } from './StrengthVolumeCard';
import { cardStyles } from './cardStyles';
import { hasStrengthSession } from './strengthSession';

/**
 * Below the metrics of a strength activity: the athlete's note (owner only —
 * the API sends null to everyone else), progress against last time, volume
 * breakdown, and the exercises set by set.
 */
export function StrengthSessionCards({
  session,
  cardStyle,
}: {
  session: StrengthSessionSummary | null | undefined;
  cardStyle?: ViewStyle;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!hasStrengthSession(session)) return null;
  const note = session.notes?.trim();

  return (
    <>
      {note ? (
        <Card style={cardStyle}>
          <Text
            style={[cardStyles.title, { color: colors.textPrimary }]}
            accessibilityRole="header"
          >
            {t('activities.strength.notesTitle')}
          </Text>
          <View style={[styles.quote, { borderLeftColor: colors.primary }]}>
            <Text style={[styles.quoteText, { color: colors.textSecondary }]}>{note}</Text>
          </View>
        </Card>
      ) : null}
      <StrengthProgressCard session={session} style={cardStyle} />
      <StrengthVolumeCard session={session} style={cardStyle} />
      <StrengthExerciseCards session={session} style={cardStyle} />
    </>
  );
}

const styles = StyleSheet.create({
  quote: {
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    marginBottom: spacing.md,
  },
  quoteText: {
    fontSize: fontSize.md,
    fontStyle: 'italic',
    lineHeight: fontSize.md * 1.5,
  },
});
