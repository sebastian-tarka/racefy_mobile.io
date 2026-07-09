import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Polygon,
  Polyline,
  Stop,
} from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { fontSize, spacing } from '../../theme';
import type { PlannedRoute } from '../../types/api';

const CHART_HEIGHT = 90;

interface Terrain {
  label: string;
  ascent: number;
  maxGrade: number;
  highPoint: number;
  points: { distance: number; elevation: number }[];
}

function analyzeTerrain(route: PlannedRoute): Terrain | null {
  const profile = route.elevation_profile;
  if (!profile || profile.length < 2) return null;

  let maxGrade = 0;
  let highPoint = -Infinity;
  for (let i = 0; i < profile.length; i++) {
    highPoint = Math.max(highPoint, profile[i].elevation);
    if (i > 0) {
      const dd = profile[i].distance - profile[i - 1].distance;
      const de = profile[i].elevation - profile[i - 1].elevation;
      if (dd > 0) maxGrade = Math.max(maxGrade, Math.abs((de / dd) * 100));
    }
  }

  const ascent = route.elevation_gain ?? 0;
  const label = ascent < 150 ? 'flat' : maxGrade > 8 || ascent > 800 ? 'hilly' : 'rolling';

  return { label, ascent, maxGrade, highPoint, points: profile };
}

/** "Course intel" card: terrain label, elevation profile sparkline, ascent / max grade / high point. */
export function EventCourseIntel({ route }: { route: PlannedRoute }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatElevation } = useUnits();
  const [width, setWidth] = useState(0);

  const terrain = useMemo(() => analyzeTerrain(route), [route]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const chart = useMemo(() => {
    if (!terrain || width <= 0) return null;
    const pts = terrain.points;
    const minEle = Math.min(...pts.map((p) => p.elevation));
    const maxEle = Math.max(...pts.map((p) => p.elevation));
    const maxDist = pts[pts.length - 1].distance || 1;
    const range = maxEle - minEle || 1;
    const pad = 6;
    const h = CHART_HEIGHT;
    const coords = pts.map((p) => {
      const x = (p.distance / maxDist) * width;
      const y = pad + (1 - (p.elevation - minEle) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const area = `0,${h} ${coords.join(' ')} ${width},${h}`;
    return { line: coords.join(' '), area };
  }, [terrain, width]);

  if (!terrain) return null;

  const stats: { label: string; value: string }[] = [
    { label: t('eventInfo.ascent', 'Ascent'), value: formatElevation(terrain.ascent) },
    { label: t('courseIntel.maxGrade', 'Max grade'), value: `${terrain.maxGrade.toFixed(1)}%` },
    { label: t('courseIntel.highPoint', 'High pt'), value: formatElevation(terrain.highPoint) },
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('courseIntel.title', 'Course intel')}
        </Text>
        <View style={[styles.terrainPill, { borderColor: colors.border }]}>
          <Text style={[styles.terrainText, { color: colors.textSecondary }]}>
            {t(`courseIntel.terrain.${terrain.label}`, terrain.label)}
          </Text>
        </View>
      </View>

      <View style={styles.chartWrap} onLayout={onLayout}>
        {chart && width > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            <Defs>
              <SvgGradient id="courseFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity={0.25} />
                <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
              </SvgGradient>
            </Defs>
            <Polygon points={chart.area} fill="url(#courseFill)" />
            <Polyline
              points={chart.line}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </View>

      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {s.label.toUpperCase()}
            </Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{s.value}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  terrainPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  terrainText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  chartWrap: {
    height: CHART_HEIGHT,
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
