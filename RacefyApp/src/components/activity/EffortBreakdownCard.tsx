import React, { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, {
  Defs,
  Line,
  LinearGradient as SvgGradient,
  Polygon,
  Polyline,
  Rect,
  Stop,
} from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { borderRadius, fontSize, spacing } from '../../theme';
import {
  effortYRange,
  PHASE_COLORS,
  splitEffortSegments,
  uniquePhaseTypes,
} from '../../utils/effortAnalysis';
import type { ActivityEffortAnalysis } from '../../types/api';

const CHART_HEIGHT = 140;

/** Baseline of the normalised scale: 1.0 = this session's typical effort. */
const BASELINE = 1;

interface EffortBreakdownCardProps {
  analysis: ActivityEffortAnalysis | null;
  /** HTTP 202 — the backend is still computing this one. */
  isPending?: boolean;
  /** Screen-level spacing, so the card matches the sections around it. */
  style?: ViewStyle | ViewStyle[];
}

/**
 * "Effort breakdown" — the phases of a single activity on a normalised scale.
 *
 * Two rules worth keeping in mind when touching this:
 * - An even session is a *result* ("well paced"), never an empty state. Most
 *   recreational training is even.
 * - Nothing here is an absolute effort figure. The scale says "1.0 = typical
 *   for this session" and that is all it can honestly say.
 *
 * Visible to anyone who can see the activity — there is no owner-only variant
 * and no tier gating.
 */
export function EffortBreakdownCard({ analysis, isPending, style }: EffortBreakdownCardProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { getDistanceValue, getDistanceUnit } = useUnits();
  const [width, setWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  // Memoised so the `?? []` fallbacks do not hand the memos below a fresh
  // array identity on every render.
  const series = useMemo(() => analysis?.effort_series ?? [], [analysis]);
  const phases = useMemo(() => analysis?.phases ?? [], [analysis]);

  const phaseTypes = useMemo(() => uniquePhaseTypes(phases), [phases]);

  const chart = useMemo(() => {
    if (series.length < 2 || width <= 0) return null;

    const maxDistance = series[series.length - 1].d || 1;
    const { min, max } = effortYRange(series);
    const range = max - min || 1;

    const x = (distance: number) => (distance / maxDistance) * width;
    const y = (effort: number) => (1 - (effort - min) / range) * CHART_HEIGHT;

    const segments = splitEffortSegments(series)
      .filter((seg) => seg.length >= 2)
      .map((seg) => {
        const coords = seg.map((p) => `${x(p.d).toFixed(1)},${y(p.e as number).toFixed(1)}`);
        const first = x(seg[0].d).toFixed(1);
        const last = x(seg[seg.length - 1].d).toFixed(1);
        return {
          line: coords.join(' '),
          area: `${first},${CHART_HEIGHT} ${coords.join(' ')} ${last},${CHART_HEIGHT}`,
        };
      });

    // One band spanning the whole chart says nothing the header does not
    // already say, so bands only appear once there is a contrast to show.
    const bands =
      phaseTypes.length > 1
        ? phases.map((phase, index) => ({
            key: `${phase.type}-${index}`,
            x: x(phase.start_distance),
            width: Math.max(x(phase.end_distance) - x(phase.start_distance), 0),
            color: PHASE_COLORS[phase.type] ?? colors.textMuted,
          }))
        : [];

    return { segments, bands, baselineY: y(BASELINE), maxDistance };
  }, [series, width, phases, phaseTypes, colors.textMuted]);

  const axisLabels = useMemo(() => {
    if (!chart) return [];
    const unit = getDistanceUnit();
    return [0, 0.25, 0.5, 0.75, 1].map((fraction, index, all) => {
      const value = getDistanceValue(chart.maxDistance * fraction);
      const formatted = value >= 10 ? value.toFixed(0) : value.toFixed(1);
      // Unit only on the last tick — repeating it five times is noise.
      return index === all.length - 1 ? `${formatted} ${unit}` : formatted;
    });
  }, [chart, getDistanceValue, getDistanceUnit]);

  if (isPending) {
    return (
      <Card style={[styles.card, ...(Array.isArray(style) ? style : style ? [style] : [])]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('activities.effortAnalysis.title')}
        </Text>
        <Text style={[styles.pending, { color: colors.textSecondary }]}>
          {t('activities.effortAnalysis.pending')}
        </Text>
      </Card>
    );
  }

  // Nothing to draw is nothing to show — the card never appears half-empty.
  if (!analysis || series.length < 2) return null;

  const { metrics } = analysis;
  const bandOpacity = isDark ? 0.18 : 0.1;
  const drift = metrics.pacing_drift_pct;
  const driftLabel = `${drift > 0 ? '+' : ''}${drift.toFixed(1)}%`;

  return (
    <Card style={[styles.card, ...(Array.isArray(style) ? style : style ? [style] : [])]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('activities.effortAnalysis.title')}
        </Text>
        {analysis.quality === 'low' && (
          <View style={[styles.qualityPill, { backgroundColor: PHASE_COLORS.peak + '22' }]}>
            <Text style={[styles.qualityText, { color: PHASE_COLORS.peak }]}>
              {t('activities.effortAnalysis.lowQuality')}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.summary, { color: colors.textSecondary }]}>
        {analysis.featureless
          ? t('activities.effortAnalysis.evenEffort')
          : t('activities.effortAnalysis.summary', {
              phases: phaseTypes
                .map((type) => t(`activities.effortAnalysis.phase.${type}`))
                .join(' → '),
            })}
      </Text>

      <View style={styles.chartWrap} onLayout={onLayout}>
        {chart && width > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            <Defs>
              <SvgGradient id="effortFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#10b981" stopOpacity={0.28} />
                <Stop offset="1" stopColor="#10b981" stopOpacity={0} />
              </SvgGradient>
            </Defs>

            {chart.bands.map((band) => (
              <Rect
                key={band.key}
                x={band.x}
                y={0}
                width={band.width}
                height={CHART_HEIGHT}
                fill={band.color}
                opacity={bandOpacity}
              />
            ))}

            <Line
              x1={0}
              y1={chart.baselineY}
              x2={width}
              y2={chart.baselineY}
              stroke={colors.textMuted}
              strokeWidth={1}
              strokeDasharray="4 4"
            />

            {chart.segments.map((segment, index) => (
              <Polygon key={`area-${index}`} points={segment.area} fill="url(#effortFill)" />
            ))}
            {chart.segments.map((segment, index) => (
              <Polyline
                key={`line-${index}`}
                points={segment.line}
                fill="none"
                stroke="#10b981"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
          </Svg>
        )}
      </View>

      <View style={styles.axisRow}>
        {axisLabels.map((label, index) => (
          <Text
            key={`${label}-${index}`}
            style={[styles.axisLabel, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.legend}>
        {phaseTypes.map((type) => (
          <View key={type} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: PHASE_COLORS[type] }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>
              {t(`activities.effortAnalysis.phase.${type}`)}
            </Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.legendDash, { borderTopColor: colors.textMuted }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>
            {t('activities.effortAnalysis.baseline')}
          </Text>
        </View>
      </View>

      <View style={[styles.metricsRow, { borderTopColor: colors.borderLight }]}>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {t('activities.effortAnalysis.pacing').toUpperCase()}
          </Text>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            {t(`activities.effortAnalysis.split.${metrics.pacing_split}`)}
          </Text>
          <Text style={[styles.metricHint, { color: colors.textMuted }]}>{driftLabel}</Text>
        </View>

        {/* Without heart rate this would be a guess dressed up as a measurement. */}
        {metrics.aerobic_decoupling_pct !== null && (
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
              {t('activities.effortAnalysis.decoupling').toUpperCase()}
            </Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {metrics.aerobic_decoupling_pct.toFixed(1)}%
            </Text>
            <Text style={[styles.metricHint, { color: colors.textMuted }]}>
              {t('activities.effortAnalysis.decouplingHint')}
            </Text>
          </View>
        )}

        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {t('activities.effortAnalysis.terrain').toUpperCase()}
          </Text>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            {Math.round(metrics.terrain_index * 100)}%
          </Text>
          <Text style={[styles.metricHint, { color: colors.textMuted }]}>
            {t('activities.effortAnalysis.terrainHint')}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  qualityPill: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  qualityText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  pending: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  summary: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  chartWrap: {
    height: CHART_HEIGHT,
    width: '100%',
    marginTop: spacing.xs,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    fontSize: fontSize.xs,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    rowGap: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDash: {
    width: 12,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: fontSize.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  metricHint: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
