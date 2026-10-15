import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { fontFamily, fontSize, fontWeight, spacing } from '../../theme';
import type { StrengthSessionSummary } from '../../types/api';
import { formatVolume, percent, skippedExercises, volumeShares } from './strengthSession';
import { cardStyles } from './cardStyles';

/** One bar per exercise (scaled to the biggest), kg and share; skipped ones listed below. */
export function StrengthVolumeCard({
  session,
  style,
}: {
  session: StrengthSessionSummary;
  style?: ViewStyle;
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const locale = i18n.language;
  const shares = volumeShares(session);
  const skipped = skippedExercises(session);
  const max = shares[0]?.exercise.volume_kg || 1;

  if (shares.length === 0 && skipped.length === 0) return null;

  return (
    <Card style={style}>
      <Text style={[cardStyles.title, { color: colors.textPrimary }]} accessibilityRole="header">
        {t('activities.strength.volumeTitle')}
      </Text>
      <View style={[cardStyles.body, styles.list]}>
        {shares.map((s) => {
          const kg = `${formatVolume(s.exercise.volume_kg, locale)} kg`;
          return (
            <View
              key={s.exercise.exercise_order}
              accessible
              accessibilityLabel={`${s.exercise.name}: ${kg}, ${percent(s.share)}%`}
            >
              <View style={styles.labelRow}>
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                  {s.exercise.name}
                </Text>
                <Text style={[styles.value, { color: colors.textSecondary }]}>
                  {kg} · {percent(s.share)}%
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${(s.exercise.volume_kg / max) * 100}%`,
                      backgroundColor: colors.series[s.colorIndex % colors.series.length],
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
        {skipped.length > 0 && (
          <Text style={[styles.skipped, { color: colors.textMuted }]}>
            {t('activities.strength.skippedList', { names: skipped.map((e) => e.name).join(', ') })}
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  value: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  skipped: {
    fontSize: fontSize.sm,
  },
});
