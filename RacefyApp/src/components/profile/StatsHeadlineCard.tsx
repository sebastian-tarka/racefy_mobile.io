import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { formatDurationCompact } from '../../utils/formatDuration';
import { borderRadius, fontSize, msFont, spacing, FONT_CAP } from '../../theme';
import type { ActivityStats } from '../../types/api';

export type StatsMetric = 'distance' | 'count' | 'time';

const METRICS: StatsMetric[] = ['distance', 'count', 'time'];

interface Props {
  stats: ActivityStats | null;
  /** Same window, one period earlier. Null when there is nothing to compare to. */
  previous: ActivityStats | null;
  metric: StatsMetric;
  onMetricChange: (metric: StatsMetric) => void;
  periodLabel: string;
}

/**
 * The one number the Stats tab leads with (design "Racefy v2" → Headline).
 *
 * The old tab asked three questions at once — period, sport, metric — and
 * answered with unlabelled bars. This answers one: how much, in this period,
 * against the one before it. The metric switch sits on the card it changes
 * rather than floating above the whole tab.
 */
export function StatsHeadlineCard({ stats, previous, metric, onMetricChange, periodLabel }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatDistance } = useUnits();

  const valueOf = (source: ActivityStats | null): number => {
    if (!source) return 0;
    if (metric === 'count') return source.count;
    if (metric === 'time') return source.totals.duration;
    return source.totals.distance;
  };

  const value = valueOf(stats);
  const prevValue = previous ? valueOf(previous) : null;
  const delta = prevValue && prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : null;
  const up = (delta ?? 0) >= 0;

  const headline =
    metric === 'count'
      ? String(stats?.count ?? 0)
      : metric === 'time'
        ? formatDurationCompact(stats?.totals.duration ?? 0)
        : formatDistance(stats?.totals.distance ?? 0);

  return (
    <View
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
    >
      <View style={styles.head}>
        <Text style={[styles.eyebrow, { color: colors.textMuted }]} numberOfLines={1}>
          {t(`profile.stats.metric.${metric}`).toUpperCase()} · {periodLabel.toUpperCase()}
        </Text>
        {delta != null && (
          <View
            style={[
              styles.delta,
              { backgroundColor: up ? colors.primary + '1F' : colors.warning + '1F' },
            ]}
          >
            <Ionicons
              name={up ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={up ? colors.primary : colors.warning}
            />
            <Text style={[styles.deltaText, { color: up ? colors.primary : colors.warning }]}>
              {Math.abs(delta).toFixed(0)}%
            </Text>
          </View>
        )}
      </View>

      <Text
        style={[styles.value, { color: colors.textPrimary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {headline}
      </Text>

      <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={2}>
        {[
          t('profile.stats.activitiesCount', { count: stats?.count ?? 0 }),
          formatDistance(stats?.totals.distance ?? 0),
          formatDurationCompact(stats?.totals.duration ?? 0),
        ].join(' · ')}
      </Text>

      <View style={[styles.segmented, { backgroundColor: colors.background }]}>
        {METRICS.map((m) => {
          const active = m === metric;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.segment, active && { backgroundColor: colors.cardBackground }]}
              onPress={() => onMetricChange(m)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                {t(`profile.stats.metric.${m}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eyebrow: {
    flex: 1,
    fontSize: msFont(10),
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  deltaText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  value: {
    fontSize: msFont(40, FONT_CAP.display),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.5,
    marginTop: spacing.sm,
  },
  summary: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  segmented: {
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
