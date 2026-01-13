import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize } from '../theme';
import type { ActivitySplit } from '../types/api';

interface BaseChartProps {
  splits: ActivitySplit[];
  title: string;
}

interface PaceChartProps extends BaseChartProps {}
interface ElevationChartProps extends BaseChartProps {}
interface HeartRateChartProps extends BaseChartProps {}

const CHART_WIDTH = Dimensions.get('window').width - spacing.md * 2 - 32;
const CHART_HEIGHT = 220;

/**
 * Pace Chart - Shows time per kilometer
 * Line going down = getting faster (better performance)
 */
export function PaceChart({ splits, title }: PaceChartProps) {
  const { colors } = useTheme();

  if (!splits || splits.length === 0) {
    return null;
  }

  // Use duration (seconds per km) directly from splits
  const durations = splits.map((split) => split.duration);
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const fastestDuration = Math.min(...durations);
  const slowestDuration = Math.max(...durations);

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const chartConfig = {
    backgroundColor: colors.cardBackground,
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => colors.textMuted,
    style: {
      borderRadius: 8,
    },
    propsForDots: {
      r: '4',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.borderLight,
    },
  };

  // Format Y-axis labels as MM:SS
  const formatYLabel = (value: string): string => {
    const seconds = parseFloat(value);
    if (isNaN(seconds)) return value;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const showAllLabels = splits.length <= 10;
  const labels = splits.map((split, i) =>
    (showAllLabels || i % 2 === 0) ? `${split.kilometer}` : ''
  );

  return (
    <View style={styles.chartContainer}>
      <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>{title}</Text>
      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: durations,
            },
          ],
        }}
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines
        withOuterLines
        withVerticalLines={false}
        withHorizontalLines
        withVerticalLabels
        withHorizontalLabels
        yAxisSuffix=""
        xAxisLabel=""
        fromZero={false}
        segments={5}
        formatYLabel={formatYLabel}
      />
      <Text style={[styles.axisLabel, { color: colors.textMuted }]}>Kilometer</Text>

      {/* Show actual pace values below chart for clarity */}
      <View style={styles.paceValuesContainer}>
        <Text style={[styles.paceValuesTitle, { color: colors.textSecondary }]}>
          Split times:
        </Text>
        <View style={styles.paceValuesGrid}>
          {splits.map((split) => (
            <View key={split.kilometer} style={styles.paceValueItem}>
              <Text style={[styles.paceKm, { color: colors.textMuted }]}>
                {split.kilometer} km
              </Text>
              <Text style={[styles.paceValue, { color: colors.textPrimary }]}>
                {split.pace}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Fastest</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {formatTime(fastestDuration)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Average</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatTime(avgDuration)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Slowest</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatTime(slowestDuration)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Elevation Chart - Shows elevation gain/loss per kilometer
 */
export function ElevationChart({ splits, title }: ElevationChartProps) {
  const { colors } = useTheme();

  if (!splits || splits.length === 0) {
    return null;
  }

  const totalElevationGain = splits.reduce((sum, s) => sum + s.elevation_gain, 0);
  const totalElevationLoss = splits.reduce((sum, s) => sum + Math.abs(s.elevation_loss), 0);

  if (totalElevationGain < 1 && totalElevationLoss < 1) {
    return null;
  }

  const elevationGains = splits.map((split) => split.elevation_gain);

  const chartConfig = {
    backgroundColor: colors.cardBackground,
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => colors.textMuted,
    style: {
      borderRadius: 8,
    },
    propsForDots: {
      r: '3',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.borderLight,
    },
  };

  const labels = splits.map((split, i) => (i % 2 === 0 ? `${split.kilometer}` : ''));

  return (
    <View style={styles.chartContainer}>
      <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>{title}</Text>
      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: elevationGains,
            },
          ],
        }}
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines
        withOuterLines
        withVerticalLines={false}
        withHorizontalLines
        withVerticalLabels
        withHorizontalLabels
        yAxisSuffix=" m"
        xAxisLabel=""
        fromZero
      />
      <Text style={[styles.axisLabel, { color: colors.textMuted }]}>Kilometer</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Gain</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {Math.round(totalElevationGain)} m
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Loss</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {Math.round(totalElevationLoss)} m
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Net</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {Math.round(totalElevationGain - totalElevationLoss)} m
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Heart Rate Chart - Shows average heart rate per kilometer
 */
export function HeartRateChart({ splits, title }: HeartRateChartProps) {
  const { colors } = useTheme();

  if (!splits || splits.length === 0) {
    return null;
  }

  const heartRateData = splits.filter((s) => s.avg_heart_rate !== null);
  if (heartRateData.length === 0) {
    return null;
  }

  const heartRates = splits.map((split) => split.avg_heart_rate || 0);
  const avgHR = heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length;
  const maxHR = Math.max(...heartRates);
  const minHR = Math.min(...heartRates.filter((hr) => hr > 0));

  const chartConfig = {
    backgroundColor: colors.cardBackground,
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
    labelColor: (opacity = 1) => colors.textMuted,
    style: {
      borderRadius: 8,
    },
    propsForDots: {
      r: '3',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.borderLight,
    },
  };

  const labels = splits.map((split, i) => (i % 2 === 0 ? `${split.kilometer}` : ''));

  return (
    <View style={styles.chartContainer}>
      <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>{title}</Text>
      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: heartRates,
            },
          ],
        }}
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines
        withOuterLines
        withVerticalLines={false}
        withHorizontalLines
        withVerticalLabels
        withHorizontalLabels
        yAxisSuffix=" bpm"
        xAxisLabel=""
        fromZero={false}
      />
      <Text style={[styles.axisLabel, { color: colors.textMuted }]}>Kilometer</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Min</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {Math.round(minHR)} bpm
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Avg</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {Math.round(avgHR)} bpm
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Max</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {Math.round(maxHR)} bpm
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    marginBottom: spacing.lg,
  },
  chartTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  chart: {
    marginVertical: spacing.xs,
    borderRadius: 8,
  },
  axisLabel: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  paceValuesContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  paceValuesTitle: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  paceValuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  paceValueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: '30%',
  },
  paceKm: {
    fontSize: fontSize.xs,
  },
  paceValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
