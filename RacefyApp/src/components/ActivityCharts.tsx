import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
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
 * Pace Chart - Shows pace per kilometer (most important for runners)
 * Uses bar chart to make it easy to compare kilometer performance
 */
export function PaceChart({ splits, title }: PaceChartProps) {
  const { colors } = useTheme();

  if (!splits || splits.length === 0) {
    return null;
  }

  // Convert pace string "5:42" to total seconds for charting
  const paceToSeconds = (paceStr: string): number => {
    const [mins, secs] = paceStr.split(':').map(Number);
    return mins * 60 + secs;
  };

  const paceSeconds = splits.map((split) => paceToSeconds(split.pace));
  const avgPace = paceSeconds.reduce((sum, p) => sum + p, 0) / paceSeconds.length;
  const fastestPace = Math.min(...paceSeconds);
  const slowestPace = Math.max(...paceSeconds);

  // Format seconds back to pace string
  const formatPace = (seconds: number): string => {
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
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.borderLight,
    },
  };

  // Labels: show every 2nd km for readability
  const labels = splits.map((split, i) => (i % 2 === 0 ? `${split.kilometer}` : ''));

  return (
    <View style={styles.chartContainer}>
      <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>{title}</Text>
      <BarChart
        // @ts-ignore - BarChart props type mismatch in react-native-chart-kit
        data={{
          labels,
          datasets: [
            {
              data: paceSeconds,
            },
          ],
        }}
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        chartConfig={chartConfig}
        style={styles.chart}
        showValuesOnTopOfBars={false}
        fromZero={false}
        withInnerLines
        withHorizontalLabels
        withVerticalLabels
        yAxisSuffix=""
        segments={5}
      />
      <Text style={[styles.axisLabel, { color: colors.textMuted }]}>Kilometer</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Fastest</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatPace(fastestPace)} /km
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Average</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatPace(avgPace)} /km
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Slowest</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatPace(slowestPace)} /km
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

  // Check if there's meaningful elevation data
  const totalElevationGain = splits.reduce((sum, s) => sum + s.elevation_gain, 0);
  const totalElevationLoss = splits.reduce((sum, s) => sum + Math.abs(s.elevation_loss), 0);

  if (totalElevationGain < 1 && totalElevationLoss < 1) {
    return null; // No meaningful elevation data
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
 * Heart Rate Chart - Shows average heart rate per kilometer (if available)
 */
export function HeartRateChart({ splits, title }: HeartRateChartProps) {
  const { colors } = useTheme();

  if (!splits || splits.length === 0) {
    return null;
  }

  // Check if heart rate data is available
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
    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // Red color for HR
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
