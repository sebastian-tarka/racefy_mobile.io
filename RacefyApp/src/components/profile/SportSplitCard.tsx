import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import type { SportTypeWithIcon } from '../../hooks/useSportTypes';
import { formatDurationCompact } from '../../utils/formatDuration';
import { borderRadius, fontSize, msFont, spacing } from '../../theme';
import { findSportTypeStat, normalizeSportTypeStats } from '../../utils/sportTypeStats';
import { sportColor } from '../../utils/sportColor';
import type { ActivityStats } from '../../types/api';
import type { StatsMetric } from './StatsHeadlineCard';

interface Props {
  stats: ActivityStats | null;
  sportTypes: SportTypeWithIcon[];
  metric: StatsMetric;
  /** Dims every other sport, so the filter above stays legible here too. */
  selectedSportTypeId: number | null;
  /** Another athlete's numbers, drawn as a second bar under each sport. */
  compareStats?: ActivityStats | null;
  compareUserName?: string;
}

/**
 * Where the total comes from (design "Racefy v2" → SplitBars).
 *
 * Horizontal bars with the sport named on each one, plus its share of the
 * total. The chart this replaces drew the same numbers as unlabelled columns —
 * readable only if you already knew which sport was which colour.
 */
export function SportSplitCard({
  stats,
  sportTypes,
  metric,
  selectedSportTypeId,
  compareStats,
  compareUserName,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatDistance } = useUnits();

  // The API names each sport itself; the local catalogue only has to supply an
  // icon, and covers the older response shape that carried the id alone.
  const rows = normalizeSportTypeStats(stats?.by_sport_type)
    .map((entry) => {
      const sport = sportTypes.find((s) => s.id === entry.sportTypeId);
      const value =
        metric === 'count' ? entry.count : metric === 'time' ? entry.duration : entry.distance;
      return {
        ...entry,
        name: entry.name ?? sport?.name,
        icon: sport?.icon,
        // Same colour the chip above uses, so a sport is recognisable by hue.
        tone: sportColor({ slug: entry.slug ?? sport?.slug, id: entry.sportTypeId ?? undefined }),
        value,
      };
    })
    .sort((a, b) => b.value - a.value);

  if (rows.length === 0) return null;

  const valueOf = (row: { count: number; duration: number; distance: number }) =>
    metric === 'count' ? row.count : metric === 'time' ? row.duration : row.distance;

  const total = rows.reduce((sum, r) => sum + r.value, 0) || 1;
  // The scale has to cover both athletes, or the comparison lies.
  const compareValues = normalizeSportTypeStats(compareStats?.by_sport_type).map(valueOf);
  const max = Math.max(...rows.map((r) => r.value), ...compareValues, 1);

  const label = (value: number, row: (typeof rows)[number]) =>
    metric === 'count'
      ? String(row.count)
      : metric === 'time'
        ? formatDurationCompact(value)
        : formatDistance(value);

  return (
    <View
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
    >
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('profile.stats.bySport')}
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted }]} numberOfLines={1}>
          {compareUserName
            ? t('profile.stats.comparedWith', { name: compareUserName })
            : t('profile.stats.shareOf', {
                metric: t(`profile.stats.metric.${metric}`).toLowerCase(),
              })}
        </Text>
      </View>

      {rows.map((row) => {
        const dimmed = selectedSportTypeId != null && selectedSportTypeId !== row.sportTypeId;
        const compareRow = findSportTypeStat(compareStats?.by_sport_type, row.sportTypeId);
        return (
          <View
            key={row.sportTypeId ?? row.slug ?? row.name}
            style={[styles.row, dimmed && styles.rowDimmed]}
          >
            <View style={styles.rowHead}>
              <View style={[styles.icon, { backgroundColor: row.tone + '1A' }]}>
                <Ionicons name={row.icon ?? 'fitness-outline'} size={14} color={row.tone} />
              </View>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {row.name ?? t('profile.stats.otherSport')}
              </Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>
                {label(row.value, row)}
              </Text>
              <Text style={[styles.share, { color: colors.textMuted }]}>
                {Math.round((row.value / total) * 100)}%
              </Text>
            </View>

            <View style={[styles.track, { backgroundColor: colors.background }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.max(2, Math.round((row.value / max) * 100))}%`,
                    backgroundColor: row.tone,
                  },
                ]}
              />
            </View>

            {compareStats && (
              <View
                style={[styles.track, styles.compareTrack, { backgroundColor: colors.background }]}
              >
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.max(
                        1,
                        Math.round(
                          (valueOf(compareRow ?? { count: 0, duration: 0, distance: 0 }) / max) *
                            100,
                        ),
                      )}%`,
                      backgroundColor: colors.textMuted,
                    },
                  ]}
                />
              </View>
            )}

            <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
              {[
                t('profile.stats.activitiesCount', { count: row.count }),
                formatDistance(row.distance),
                formatDurationCompact(row.duration),
              ].join(' · ')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  hint: {
    fontSize: fontSize.xs,
  },
  row: {
    marginTop: spacing.md,
  },
  rowDimmed: {
    opacity: 0.4,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  share: {
    width: 40,
    textAlign: 'right',
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: spacing.xs + 2,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  compareTrack: {
    height: 5,
    marginTop: spacing.xs,
  },
  meta: {
    fontSize: msFont(10),
    marginTop: spacing.xs + 1,
  },
});
