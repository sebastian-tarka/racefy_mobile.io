import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { InsightCard } from './InsightCard';
import { FilterChip } from '../FilterChip';
import { useFetch } from '../../hooks/useFetch';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { api } from '../../services/api';
import { fontSize, fontWeight, spacing } from '../../theme';
import type { TempoMetric, WeeklyVolume, WeeklyVolumeWeek } from '../../types/insights';

const BAR_HEIGHT = 96;
const TEMPO_HEIGHT = 56;

function weekLabel(weekStart: string, locale: string): string {
  return new Date(`${weekStart}T12:00:00`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'numeric',
  });
}

/** "4:52" — seconds as minutes:seconds. */
function mmss(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Eight weeks of volume (GET /insights/weekly, Plus+): distance per week as
 * columns, and — once a sport is picked — its tempo as a separate small line
 * below. Never a second axis on one chart: a pace and a distance share no scale.
 */
export function WeeklyVolumeCard() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { formatDistanceFromKm, formatPaceFromSecPerKm, getPaceUnit, formatSpeed } = useUnits();
  const [sportId, setSportId] = useState<number | null>(null);
  // The sport list comes from the all-sports answer and stays put while a
  // sport is picked, so the chips do not jump around.
  const [sports, setSports] = useState<WeeklyVolume['sports']>([]);

  const { data, isLoading, error } = useFetch<WeeklyVolume>(
    async () => {
      const result = await api.getInsightsWeekly(sportId);
      if (sportId == null) setSports(result.sports);
      return result;
    },
    { deps: [sportId], logCategory: 'api' },
  );

  const formatTempo = (metric: TempoMetric, value: number): string => {
    if (metric === 'pace_km') return `${formatPaceFromSecPerKm(value)} ${getPaceUnit()}`;
    if (metric === 'pace_100m') return `${mmss(value)} /100 m`;
    if (metric === 'speed') return formatSpeed(value / 3.6);
    return '';
  };

  const weeks: WeeklyVolumeWeek[] = data?.weeks ?? [];
  const maxKm = Math.max(...weeks.map((w) => w.distance_km), 0);
  const totalKm = weeks.reduce((sum, w) => sum + w.distance_km, 0);
  const tempoMetric = sportId != null ? (data?.tempo_metric ?? null) : null;
  const tempoWeeks = weeks.filter((w) => w.tempo != null && w.tempo > 0);
  const latestTempo = tempoWeeks[tempoWeeks.length - 1]?.tempo ?? null;

  return (
    <InsightCard title={t('insights.weekly.title')} icon="bar-chart">
      {sports.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <FilterChip
            label={t('insights.weekly.allSports')}
            active={sportId == null}
            onPress={() => setSportId(null)}
          />
          {sports.map((s) => (
            <FilterChip
              key={s.sport_type_id}
              label={s.name}
              active={sportId === s.sport_type_id}
              onPress={() => setSportId(s.sport_type_id)}
            />
          ))}
        </ScrollView>
      )}

      {isLoading && !data ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : error && !data ? (
        <Text style={[styles.muted, { color: colors.textMuted }]}>{error}</Text>
      ) : (
        <>
          <Text style={[styles.total, { color: colors.textPrimary }]}>
            {formatDistanceFromKm(totalKm)}
          </Text>
          <Text style={[styles.muted, { color: colors.textMuted }]}>
            {t('insights.weekly.lastWeeks', { count: weeks.length })}
          </Text>

          <View style={styles.chart} accessibilityRole="summary">
            {weeks.map((w) => {
              const height = maxKm > 0 ? Math.max((w.distance_km / maxKm) * BAR_HEIGHT, 3) : 3;
              return (
                <View
                  key={w.week_start}
                  style={styles.column}
                  accessible
                  accessibilityLabel={`${weekLabel(w.week_start, i18n.language)}: ${formatDistanceFromKm(w.distance_km)}`}
                >
                  <View style={styles.barSlot}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height,
                          backgroundColor: w.distance_km > 0 ? colors.primary : colors.border,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.axis, { color: colors.textMuted }]}>
                    {weekLabel(w.week_start, i18n.language)}
                  </Text>
                </View>
              );
            })}
          </View>

          {tempoMetric && tempoWeeks.length > 0 && latestTempo != null && (
            <TempoLine
              weeks={weeks}
              color={colors.ai}
              label={t(`insights.weekly.tempo.${tempoMetric}`)}
              latest={formatTempo(tempoMetric, latestTempo)}
              // Pace: lower is faster, so it is drawn upside down — up means better.
              invert={tempoMetric !== 'speed'}
            />
          )}
        </>
      )}
    </InsightCard>
  );
}

function TempoLine({
  weeks,
  color,
  label,
  latest,
  invert,
}: {
  weeks: WeeklyVolumeWeek[];
  color: string;
  label: string;
  latest: string;
  invert: boolean;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const values = weeks.map((w) => (w.tempo != null && w.tempo > 0 ? w.tempo : null));
  const present = values.filter((v): v is number => v != null);
  const min = Math.min(...present);
  const max = Math.max(...present);
  const step = weeks.length > 1 ? width / weeks.length : 0;
  const points = values
    .map((v, i) => {
      if (v == null) return null;
      const ratio = max === min ? 0.5 : (v - min) / (max - min);
      const y = (invert ? ratio : 1 - ratio) * (TEMPO_HEIGHT - 8) + 4;
      return { x: step * i + step / 2, y };
    })
    .filter((p): p is { x: number; y: number } => p != null);

  return (
    <View style={styles.tempo}>
      <View style={styles.tempoHeader}>
        <Text style={[styles.tempoLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.tempoValue, { color }]}>{latest}</Text>
      </View>
      <View style={{ height: TEMPO_HEIGHT }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={TEMPO_HEIGHT}>
            {points.length > 1 && (
              <Polyline
                points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {points.map((p) => (
              <Circle key={`${p.x}`} cx={p.x} cy={p.y} r={3} fill={color} />
            ))}
          </Svg>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  loading: {
    marginVertical: spacing.xl,
  },
  total: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  muted: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: spacing.md,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  barSlot: {
    height: BAR_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  axis: {
    fontSize: fontSize.xs,
    marginTop: 4,
  },
  tempo: {
    marginTop: spacing.lg,
  },
  tempoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  tempoLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tempoValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
});
