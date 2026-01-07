import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import { useActivityStats } from '../../../../hooks/useActivityStats';
import { spacing, fontSize, borderRadius } from '../../../../theme';

interface WeeklyStatsCardProps {
  onPress?: () => void;
}

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
};

export function WeeklyStatsCard({ onPress }: WeeklyStatsCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { stats, isLoading } = useActivityStats();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  const statItems = [
    {
      icon: 'fitness-outline' as const,
      value: stats.count.toString(),
      label: t('home.weeklyStats.activities', 'Activities'),
      color: '#10b981',
    },
    {
      icon: 'navigate-outline' as const,
      value: formatDistance(stats.totals.distance),
      label: t('home.weeklyStats.distance', 'Distance'),
      color: '#3b82f6',
    },
    {
      icon: 'time-outline' as const,
      value: formatDuration(stats.totals.duration),
      label: t('home.weeklyStats.time', 'Time'),
      color: '#f59e0b',
    },
    {
      icon: 'flame-outline' as const,
      value: `${Math.round(stats.totals.calories)}`,
      label: t('home.weeklyStats.calories', 'Calories'),
      color: '#ef4444',
    },
  ];

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark || '#059669']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('home.weeklyStats.title', 'Your Stats')}</Text>
        <Ionicons name="stats-chart" size={20} color="rgba(255,255,255,0.8)" />
      </View>

      <View style={styles.statsGrid}>
        {statItems.map((item, index) => (
          <View key={index} style={styles.statItem}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name={item.icon} size={18} color="#fff" />
            </View>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
});
