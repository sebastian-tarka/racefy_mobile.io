import React, { useState, useMemo, useRef, memo } from 'react';
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
  compareData?: ActivityStats['by_sport_type'] | null;
  compareUserName?: string;
}

// Track globally if any chart has animated (persists across mounts)
let globalHasAnimated = false;

function SportStatsChartComponent({
  data,
  sportTypes,
  compareData,
  compareUserName,
}: SportStatsChartProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [metric, setMetric] = useState<Metric>('distance');

  // Use ref for this instance, synced with global flag
  const shouldAnimate = useRef(!globalHasAnimated);

  // Mark as animated after first render
  if (!globalHasAnimated) {
    globalHasAnimated = true;
  }

  const primaryColor = colors.primary;
  const compareColor = '#FF6B6B'; // Red color for comparison

  const isComparing = compareData && Object.keys(compareData).length > 0;

  const getValueAndLabel = (
    stats: { distance: number; duration: number; count: number },
    metricType: Metric
  ): { value: number; labelText: string } => {
    switch (metricType) {
      case 'distance':
        const distanceKm = stats.distance / 1000;
        return { value: distanceKm, labelText: `${distanceKm.toFixed(1)}` };
      case 'count':
        return { value: stats.count, labelText: `${stats.count}` };
      case 'duration':
        const hours = stats.duration / 3600;
        return { value: hours, labelText: `${hours.toFixed(1)}` };
      default:
        return { value: 0, labelText: '0' };
    }
  };

  const chartData = useMemo(() => {
    if (!data || Object.keys(data).length === 0) {
      return [];
    }

    // Get all sport type IDs that appear in either dataset
    const allSportTypeIds = new Set<string>();
    Object.keys(data).forEach((id) => allSportTypeIds.add(id));
    if (compareData) {
      Object.keys(compareData).forEach((id) => allSportTypeIds.add(id));
    }

    // Create combined data
    const combinedData = Array.from(allSportTypeIds).map((sportTypeId) => {
      const sportTypeIdNum = parseInt(sportTypeId, 10);
      const sportType = sportTypes.find((s) => s.id === sportTypeIdNum);
      const myStats = data[sportTypeIdNum];
      const theirStats = compareData?.[sportTypeIdNum];

      const myValues = myStats
        ? getValueAndLabel(myStats, metric)
        : { value: 0, labelText: '0' };
      const theirValues = theirStats
        ? getValueAndLabel(theirStats, metric)
        : { value: 0, labelText: '0' };

      return {
        sportTypeId,
        sportName: sportType?.name || 'Unknown',
        myValue: myValues.value,
        myLabel: myValues.labelText,
        theirValue: theirValues.value,
        theirLabel: theirValues.labelText,
        maxValue: Math.max(myValues.value, theirValues.value),
      };
    });

    // Filter and sort
    return combinedData
      .filter((item) => item.myValue > 0 || item.theirValue > 0)
      .sort((a, b) => b.maxValue - a.maxValue)
      .slice(0, 5); // Show top 5 for comparison
  }, [data, compareData, sportTypes, metric]);

  // Build bar chart data - use grouped bars for comparison
  const barChartData = useMemo(() => {
    if (!isComparing) {
      // Single user mode - simple bars
      return chartData.map((item) => ({
        value: item.myValue,
        label: item.sportName,
        topLabelText: item.myLabel,
        frontColor: primaryColor,
      }));
    }

    // Comparison mode - interleaved bars for grouped effect
    const result: Array<{
      value: number;
      label?: string;
      topLabelText?: string;
      frontColor: string;
      spacing?: number;
    }> = [];

    chartData.forEach((item, index) => {
      // My bar
      result.push({
        value: item.myValue,
        label: index === 0 ? '' : undefined, // Only first bar gets label handling
        topLabelText: item.myLabel,
        frontColor: primaryColor,
        spacing: 2,
      });
      // Their bar
      result.push({
        value: item.theirValue,
        label: item.sportName,
        topLabelText: item.theirLabel,
        frontColor: compareColor,
        spacing: index < chartData.length - 1 ? 20 : undefined,
      });
    });

    return result;
  }, [chartData, isComparing, primaryColor, compareColor]);

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

      {/* Legend for comparison mode */}
      {isComparing && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: primaryColor }]}
            />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              {t('profile.stats.you')}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: compareColor }]}
            />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              {compareUserName || t('profile.stats.compareUser')}
            </Text>
          </View>
        </View>
      )}

      {/* Bar Chart */}
      <View style={styles.chartContainer}>
        <BarChart
          data={barChartData}
          barWidth={isComparing ? 20 : 32}
          barBorderRadius={4}
          frontColor={primaryColor}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={colors.border}
          noOfSections={4}
          hideRules
          hideYAxisText
          showValuesAsTopLabel
          topLabelTextStyle={[styles.barLabel, { color: colors.textSecondary }]}
          xAxisLabelTextStyle={[
            styles.xAxisLabel,
            { color: colors.textSecondary, width: isComparing ? 50 : 60 },
          ]}
          isAnimated={shouldAnimate.current}
          animationDuration={500}
          spacing={isComparing ? undefined : 20}
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: fontSize.xs,
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

// Memoize to prevent re-renders when parent state changes
export const SportStatsChart = memo(
  SportStatsChartComponent,
  (prevProps, nextProps) => {
    return (
      JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data) &&
      JSON.stringify(prevProps.compareData) ===
        JSON.stringify(nextProps.compareData) &&
      prevProps.compareUserName === nextProps.compareUserName &&
      prevProps.sportTypes.length === nextProps.sportTypes.length
    );
  }
);
