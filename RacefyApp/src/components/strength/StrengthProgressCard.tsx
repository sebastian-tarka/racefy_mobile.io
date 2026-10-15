import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { fontFamily, fontSize, fontWeight, spacing } from '../../theme';
import type { StrengthSessionSummary } from '../../types/api';
import { comparedExercises } from './strengthSession';
import { cardStyles } from './cardStyles';
import { useStrengthFormat } from './useStrengthFormat';

/**
 * Best set now against the best set the last time the exercise was done.
 * Better = amber; worse is only muted, never red — a lighter day is not a failure.
 */
export function StrengthProgressCard({
  session,
  style,
}: {
  session: StrengthSessionSummary;
  style?: ViewStyle;
}) {
  const { t } = useTranslation();
  const fmt = useStrengthFormat();
  const { colors } = useTheme();
  const compared = comparedExercises(session);

  return (
    <Card style={style}>
      <Text style={[cardStyles.title, { color: colors.textPrimary }]} accessibilityRole="header">
        {t('activities.strength.progressTitle')}
      </Text>
      {compared.length === 0 ? (
        <Text style={[cardStyles.empty, { color: colors.textSecondary }]}>
          {t('activities.strength.progressEmpty')}
        </Text>
      ) : (
        <View style={cardStyles.body}>
          {compared.map((e, i) => {
            const delta = fmt.progress(e.progress!);
            const from = fmt.set(e.previous!.best_set);
            const to = fmt.set(e.best_set);
            const toneColor =
              delta.tone === 'up'
                ? colors.warningStrong
                : delta.tone === 'down'
                  ? colors.textMuted
                  : colors.textPrimary;
            return (
              <View
                key={e.exercise_order}
                style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                accessible
                accessibilityLabel={`${e.name}: ${from} → ${to}, ${delta.text}`}
              >
                <View style={styles.main}>
                  <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                    {e.name}
                  </Text>
                  <Text style={[styles.compare, { color: colors.textSecondary }]} numberOfLines={1}>
                    {from} → {to}
                  </Text>
                </View>
                <Text style={[styles.delta, { color: toneColor }]}>{delta.text}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  compare: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  delta: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    textAlign: 'right',
  },
});
