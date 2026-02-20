import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import { useUnits } from '../../../../hooks/useUnits';
import { useActivityStats } from '../../../../hooks/useActivityStats';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../../theme';
import { StatCard } from './StatCard';
import type { ActivityStats } from '../../../../types/api';

interface WeeklyStatsCardV2Props {
  stats?: ActivityStats | null;  // Opcjonalne statystyki z zewnątrz
  onPress?: () => void;
}


const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}min`;
};

/**
 * WeeklyStatsCardV2 - Nowa wersja karty statystyk
 *
 * Zmiany w wersji V2:
 * - Układ 2x2 grid zamiast pojedynczej karty z gradientem
 * - Indywidualne karty StatCard dla każdej statystyki
 * - Nagłówek sekcji z linkiem "Szczegóły"
 * - Animowane liczby w StatCard
 */
export function WeeklyStatsCardV2({ stats: statsFromProps, onPress }: WeeklyStatsCardV2Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { getDistanceValue, getDistanceUnit, getSmallDistanceUnit } = useUnits();

  const formatDistance = (meters: number): { value: number; suffix: string; decimals: number } => {
    if (meters >= 1000) {
      return { value: getDistanceValue(meters), suffix: ` ${getDistanceUnit()}`, decimals: 1 };
    }
    return { value: Math.round(meters), suffix: ` ${getSmallDistanceUnit()}`, decimals: 0 };
  };

  // Użyj stats z propa lub pobierz z API
  const { stats: statsFromApi, isLoading: isLoadingApi } = useActivityStats();
  const stats = statsFromProps || statsFromApi;
  const isLoading = statsFromProps ? false : isLoadingApi;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.cardBackground }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  const distanceData = formatDistance(stats.totals.distance);

  const statItems = [
    {
      icon: 'fitness-outline' as const,
      iconColor: colors.primary,
      label: t('home.weeklyStats.activities'),
      value: stats.count,
      suffix: '',
      decimals: 0,
      valueColor: colors.primary,
    },
    {
      icon: 'navigate-outline' as const,
      iconColor: colors.info,
      label: t('home.weeklyStats.distance'),
      value: distanceData.value,
      suffix: distanceData.suffix,
      decimals: distanceData.decimals,
      valueColor: colors.info,
    },
    {
      icon: 'time-outline' as const,
      iconColor: colors.textMuted,
      label: t('home.weeklyStats.time'),
      value: formatDuration(stats.totals.duration),
      suffix: '',
      decimals: 0,
      valueColor: colors.textMuted,
    },
    {
      icon: 'flame-outline' as const,
      iconColor: colors.orange,
      label: t('home.weeklyStats.calories'),
      value: Math.round(stats.totals.calories),
      suffix: '',
      decimals: 0,
      valueColor: colors.orange,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('home.weeklyStats.title')}
        </Text>
        {onPress && (
          <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Text style={[styles.detailsLink, { color: colors.primary }]}>
              {t('home.weeklyStats.details')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.grid}>
        {statItems.map((item, index) => (
          <View
            key={index}
            style={[
              styles.gridItem,
              index % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight,
            ]}
          >
            <StatCard
              icon={item.icon}
              iconColor={item.iconColor}
              label={item.label}
              value={item.value}
              suffix={item.suffix}
              decimals={item.decimals}
              valueColor={item.valueColor}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    marginBottom: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  detailsLink: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  gridItemLeft: {},
  gridItemRight: {},
});
