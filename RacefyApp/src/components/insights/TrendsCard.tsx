import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InsightCard } from './InsightCard';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { TrendsData } from '../../types/insights';

interface TrendsCardProps {
  data: TrendsData;
}

function ChangeIndicator({ value, colors }: { value: number | null; colors: ReturnType<typeof useTheme>['colors'] }) {
  if (value === null || value === undefined) return null;
  const color = value === 0 ? colors.textMuted : value > 0 ? colors.success : colors.error;
  const text = value === 0 ? '0%' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  return <Text style={[styles.changeText, { color }]}>{text}</Text>;
}

function TrendComparison({ label, current, previous, changePct, unit, colors, isDark }: {
  label: string;
  current: string;
  previous: string;
  changePct: number | null;
  unit: string;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}) {
  return (
    <View style={[styles.trendBlock, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
      <Text style={[styles.trendLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.trendValues}>
        <View style={styles.trendColumn}>
          <Text style={[styles.trendValue, { color: colors.textPrimary }]}>{current}</Text>
          <Text style={[styles.trendUnit, { color: colors.textMuted }]}>{unit}</Text>
        </View>
        <Text style={[styles.vsText, { color: colors.textMuted }]}>vs</Text>
        <View style={styles.trendColumn}>
          <Text style={[styles.trendValueSmall, { color: colors.textMuted }]}>{previous}</Text>
          <Text style={[styles.trendUnit, { color: colors.textMuted }]}>{unit}</Text>
        </View>
        <ChangeIndicator value={changePct} colors={colors} />
      </View>
    </View>
  );
}

export function TrendsCard({ data }: TrendsCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const weekly = data.weekly;
  const breakdown = data.weekly_breakdown ?? [];
  const maxDistance = Math.max(...breakdown.map(w => w.distance_km), 1);

  return (
    <InsightCard title={t('insights.trends.title')} icon="trending-up">
      <TrendComparison
        label={t('insights.trends.weeklyDistance')}
        current={weekly.this_week.distance_km.toFixed(1)}
        previous={weekly.last_week.distance_km.toFixed(1)}
        changePct={weekly.distance_change_pct}
        unit="km"
        colors={colors}
        isDark={isDark}
      />

      {data.monthly && (
        <TrendComparison
          label={t('insights.trends.monthlyDistance')}
          current={data.monthly.this_month.distance_km.toFixed(1)}
          previous={data.monthly.last_month.distance_km.toFixed(1)}
          changePct={data.monthly.distance_change_pct}
          unit="km"
          colors={colors}
          isDark={isDark}
        />
      )}

      {breakdown.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>
            {t('insights.trends.weeklyBreakdown')}
          </Text>
          <View style={styles.chart}>
            {breakdown.slice(-4).map((week) => {
              const height = Math.max((week.distance_km / maxDistance) * 80, 4);
              return (
                <View key={week.week_start} style={styles.barColumn}>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, { color: colors.textMuted }]}>
                    {week.distance_km.toFixed(0)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </InsightCard>
  );
}

const styles = StyleSheet.create({
  trendBlock: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  trendLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  trendValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trendColumn: {
    alignItems: 'center',
  },
  trendValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  trendValueSmall: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  trendUnit: {
    fontSize: fontSize.xs,
  },
  vsText: {
    fontSize: fontSize.xs,
  },
  changeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginLeft: 'auto',
  },
  chartSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  chartLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 80,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 24,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});
