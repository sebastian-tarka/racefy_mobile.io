import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize } from '../theme';
import type { TrackPoint } from '../types/api';

interface BaseChartProps {
  trackPoints: TrackPoint[];
  title: string;
}

interface ElevationChartProps extends BaseChartProps {}
interface SpeedChartProps extends BaseChartProps {}

const CHART_WIDTH = Dimensions.get('window').width - spacing.md * 2 - 32; // Account for card padding
const CHART_HEIGHT = 220;

export function ElevationChart({ trackPoints, title }: ElevationChartProps) {
  const { colors } = useTheme();

  console.log('[ElevationChart] Render with trackPoints:', {
    length: trackPoints?.length,
    isArray: Array.isArray(trackPoints),
    sample: trackPoints?.slice(0, 2)
  });

  if (!trackPoints || !Array.isArray(trackPoints) || trackPoints.length === 0) {
    console.log('[ElevationChart] Returning null - validation failed');
    return null;
  }

  console.log('[ElevationChart] Validation passed, rendering chart');

  // Sample data points if there are too many (keep max ~50 points for better performance)
  const maxPoints = 50;
  const step = Math.ceil(trackPoints.length / maxPoints);
  const sampledPoints = trackPoints.filter((_, index) => index % step === 0);

  // Prepare data: distance (km) vs elevation (m)
  const distances = sampledPoints.map((point) => point.distance / 1000);
  const elevations = sampledPoints.map((point) => point.elevation);

  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const elevationRange = maxElevation - minElevation;

  const chartConfig = {
    backgroundColor: colors.cardBackground,
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Emerald color
    labelColor: (opacity = 1) => colors.textMuted,
    style: {
      borderRadius: 8,
    },
    propsForDots: {
      r: '0', // Hide dots for cleaner look
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // Solid lines
      stroke: colors.borderLight,
    },
  };

  // Create labels (show every 3rd distance label to avoid crowding)
  const labels = distances.map((d, i) => (i % 3 === 0 ? d.toFixed(1) : ''));

  return (
    <View style={styles.chartContainer}>
      <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>{title}</Text>
      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: elevations,
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
        fromZero={false}
      />
      <Text style={[styles.axisLabel, { color: colors.textMuted }]}>Distance (km)</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Min</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {Math.round(minElevation)} m
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Max</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {Math.round(maxElevation)} m
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Range</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {Math.round(elevationRange)} m
          </Text>
        </View>
      </View>
    </View>
  );
}

export function SpeedChart({ trackPoints, title }: SpeedChartProps) {
  const { colors } = useTheme();

  if (!trackPoints || !Array.isArray(trackPoints) || trackPoints.length === 0) {
    return null;
  }

  // Sample data points if there are too many
  const maxPoints = 50;
  const step = Math.ceil(trackPoints.length / maxPoints);
  const sampledPoints = trackPoints.filter((_, index) => index % step === 0);

  // Prepare data: distance (km) vs speed (km/h)
  const distances = sampledPoints.map((point) => point.distance / 1000);
  const speeds = sampledPoints.map((point) => point.speed * 3.6); // Convert m/s to km/h

  const minSpeed = Math.min(...speeds);
  const maxSpeed = Math.max(...speeds);
  const avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;

  const chartConfig = {
    backgroundColor: colors.cardBackground,
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Emerald color
    labelColor: (opacity = 1) => colors.textMuted,
    style: {
      borderRadius: 8,
    },
    propsForDots: {
      r: '0',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.borderLight,
    },
  };

  // Create labels
  const labels = distances.map((d, i) => (i % 3 === 0 ? d.toFixed(1) : ''));

  return (
    <View style={styles.chartContainer}>
      <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>{title}</Text>
      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: speeds,
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
        yAxisSuffix=" km/h"
        xAxisLabel=""
        fromZero={false}
      />
      <Text style={[styles.axisLabel, { color: colors.textMuted }]}>Distance (km)</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Min</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {minSpeed.toFixed(1)} km/h
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Avg</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {avgSpeed.toFixed(1)} km/h
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Max</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {maxSpeed.toFixed(1)} km/h
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
