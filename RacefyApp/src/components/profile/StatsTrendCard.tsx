import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { formatDurationCompact } from '../../utils/formatDuration';
import { borderRadius, fontSize, msFont, spacing } from '../../theme';
import type { ActivityTrendPoint, TrendGranularity } from '../../types/api';
import type { StatsMetric } from './StatsHeadlineCard';

interface Props {
  trends: ActivityTrendPoint[];
  granularity: TrendGranularity;
  metric: StatsMetric;
  isLoading?: boolean;
}

/** Column height in dp — enough for a shape, short enough to stay a summary. */
const CHART_HEIGHT = 96;

/**
 * Is it going up? (design "Racefy v2" → TrendChart.)
 *
 * One column per bucket, with the best one filled and labelled. Buckets the
 * server zero-filled keep a stub column instead of disappearing: a gap in
 * training is information, and a chart that silently drops empty weeks makes a
 * broken streak look like a continuous one.
 */
export function StatsTrendCard({ trends, granularity, metric, isLoading }: Props) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const { formatDistance } = useUnits();

  if (!isLoading && trends.length === 0) return null;

  const valueOf = (point: ActivityTrendPoint) =>
    metric === 'count'
      ? point.activities_count
      : metric === 'time'
        ? point.total_duration
        : point.total_distance;

  const label = (value: number) =>
    metric === 'count'
      ? String(Math.round(value))
      : metric === 'time'
        ? formatDurationCompact(value)
        : formatDistance(value);

  const values = trends.map(valueOf);
  const max = Math.max(...values, 1);
  const peak = values.indexOf(Math.max(...values));
  const hasData = values.some((v) => v > 0);

  return (
    <View
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
    >
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('profile.stats.trend.title')}
        </Text>
        {hasData && (
          <Text style={[styles.hint, { color: colors.textMuted }]} numberOfLines={1}>
            {t('profile.stats.trend.best', {
              value: label(values[peak]),
              period: bucketLabel(trends[peak].period, granularity, i18n.language),
            })}
          </Text>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <View style={styles.chart}>
          {trends.map((point, index) => {
            const value = values[index];
            const isPeak = index === peak && value > 0;
            const height = value > 0 ? Math.max(6, (value / max) * CHART_HEIGHT) : 2;

            return (
              <View key={point.period} style={styles.column}>
                {isPeak && (
                  <Text style={[styles.peakValue, { color: colors.primary }]} numberOfLines={1}>
                    {label(value)}
                  </Text>
                )}
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor:
                        value === 0
                          ? colors.background
                          : isPeak
                            ? colors.primary
                            : colors.primary + '2E',
                    },
                  ]}
                />
                <Text style={[styles.bucket, { color: colors.textMuted }]} numberOfLines={1}>
                  {bucketLabel(point.period, granularity, i18n.language)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** "2026-W21" → "W21"; "2026-03" → the month's short name. */
function bucketLabel(period: string, granularity: TrendGranularity, language: string): string {
  if (granularity === 'weekly') return period.split('-')[1] ?? period;
  const [year, month] = period.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return period;
  return date.toLocaleDateString(language, { month: 'short' });
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
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  hint: {
    flexShrink: 1,
    fontSize: fontSize.xs,
  },
  loader: {
    height: CHART_HEIGHT + 34,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs + 1,
    minHeight: CHART_HEIGHT + 34,
  },
  column: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: spacing.xs + 1,
  },
  peakValue: {
    fontSize: msFont(10),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  bar: {
    alignSelf: 'stretch',
    borderRadius: 6,
    marginTop: 'auto',
  },
  bucket: {
    fontSize: msFont(9),
    fontVariant: ['tabular-nums'],
  },
});
