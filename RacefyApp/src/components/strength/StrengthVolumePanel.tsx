import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { fontFamily, fontSize, fontWeight, msFont, spacing } from '../../theme';
import type { StrengthSessionSummary } from '../../types/api';
import { StrengthChip } from './StrengthChip';
import { StrengthSectionLabel } from './StrengthSectionLabel';
import { percent, volumeShares } from './strengthSession';
import { useStrengthFormat } from './useStrengthFormat';

/**
 * Total volume, one bar split by exercise, and the records of the session.
 * Feed card (under the mosaic); the activity screen uses StrengthVolumeCard.
 */
export function StrengthVolumePanel({ session }: { session: StrengthSessionSummary }) {
  const { t } = useTranslation();
  const fmt = useStrengthFormat();
  const { colors } = useTheme();
  const shares = volumeShares(session);
  const seriesColor = (i: number) => colors.series[i % colors.series.length];

  return (
    <View>
      <StrengthSectionLabel>{t('activities.strength.liftedTotal')}</StrengthSectionLabel>
      <View style={styles.totalRow}>
        <Text style={[styles.total, { color: colors.textPrimary }]}>
          {fmt.volume(session.stats.volume_kg)}
        </Text>
        <Text style={[styles.unit, { color: colors.textSecondary }]}>{fmt.unit}</Text>
      </View>

      {shares.length > 0 && (
        <>
          <View
            style={styles.bar}
            accessible
            accessibilityRole="image"
            accessibilityLabel={shares
              .map((s) => `${s.exercise.name} ${percent(s.share)}%`)
              .join(', ')}
          >
            {shares.map((s) => (
              <View
                key={s.exercise.exercise_order}
                style={[
                  styles.barPart,
                  { flex: s.share, backgroundColor: seriesColor(s.colorIndex) },
                ]}
              />
            ))}
          </View>
          <View style={styles.list}>
            {shares.map((s) => (
              <View key={s.exercise.exercise_order} style={styles.listRow}>
                <View style={[styles.swatch, { backgroundColor: seriesColor(s.colorIndex) }]} />
                <Text style={[styles.listName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {s.exercise.name}
                </Text>
                <Text style={[styles.listPct, { color: colors.textSecondary }]}>
                  {percent(s.share)}%
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {session.highlights.length > 0 && (
        <View style={styles.highlights}>
          {session.highlights.map((h) => (
            <StrengthChip key={h.exercise_order} arrow label={h.name} value={fmt.delta(h)} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: spacing.xs,
  },
  total: {
    fontFamily: fontFamily.mono,
    fontSize: msFont(30),
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  bar: {
    flexDirection: 'row',
    height: 12,
    gap: 3,
    marginTop: spacing.md,
  },
  barPart: {
    borderRadius: 3,
  },
  list: {
    marginTop: spacing.md,
    gap: 6,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  listName: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  listPct: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
  },
  highlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.md,
  },
});
