import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { ActivityStats } from '../types/api';
import type { SportTypeWithIcon } from '../hooks/useSportTypes';

type Metric = 'distance' | 'count' | 'duration';

interface SportStatsChartProps {
  data: ActivityStats['by_sport_type'];
  sportTypes: SportTypeWithIcon[];
}

export function SportStatsChart({ data, sportTypes }: SportStatsChartProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [metric, setMetric] = useState<Metric>('distance');

  const chartData = useMemo(() => {
    if (!data || Object.keys(data).length === 0) {
      return [];
    }

    return Object.entries(data)
      .map(([sportTypeId, stats]) => {
        const sportType = sportTypes.find((s) => s.id === parseInt(sportTypeId));
        let value: number;
        let label: string;

        switch (metric) {
          case 'distance':
            value = stats.distance / 1000; // Convert to km
            label = `${value.toFixed(1)}km`;
            break;
          case 'count':
            value = stats.count;
            label = `${value}`;
            break;
          case 'duration':
            value = stats.duration / 3600; // Convert to hours
            label = `${value.toFixed(1)}h`;
            break;
          default:
            value = 0;
            label = '0';
        }

        return {
          value,
          label: sportType?.name || 'Unknown',
          topLabelComponent: () => (
            <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
              {label}
            </Text>
          ),
          frontColor: colors.primary,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Show top 6
  }, [data, sportTypes, metric, colors]);

  const metrics: { key: Metric; label: string }[] = [
    { key: 'distance', label: t('profile.activities.chartMetric.distance') },
    { key: 'count', label: t('profile.activities.chartMetric.count') },
    { key: 'duration', label: t('profile.activities.chartMetric.duration') },
  ];

  if (chartData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t('profile.activities.noStats')}
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Metric Selector */}
      <View style={styles.metricSelector}>
        {metrics.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[
              styles.metricButton,
              {
                backgroundColor:
                  metric === m.key ? colors.primary : colors.background,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setMetric(m.key)}
          >
            <Text
              style={[
                styles.metricText,
                { color: metric === m.key ? colors.white : colors.primary },
              ]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bar Chart */}
      <View style={styles.chartContainer}>
        <BarChart
          data={chartData}
          barWidth={32}
          barBorderRadius={4}
          frontColor={colors.primary}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={colors.border}
          noOfSections={4}
          hideRules
          hideYAxisText
          xAxisLabelTextStyle={[styles.xAxisLabel, { color: colors.textSecondary }]}
          isAnimated
          animationDuration={500}
          spacing={20}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metricSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  metricText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  chartContainer: {
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  barLabel: {
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  xAxisLabel: {
    fontSize: fontSize.xs,
    width: 60,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
