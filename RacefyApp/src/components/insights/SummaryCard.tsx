import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { InsightCard } from './InsightCard';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { ActivitySummary } from '../../types/insights';

interface SummaryCardProps {
  data: ActivitySummary;
}

function StatBox({ label, value, icon, colors, isDark }: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}) {
  return (
    <View style={[styles.statBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
      <Ionicons name={icon} size={18} color={colors.primary} style={styles.statIcon} />
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function SummaryCard({ data }: SummaryCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const formatDistance = (km: number) => km >= 1000 ? `${(km / 1000).toFixed(1)}k` : km.toFixed(1);
  const formatDuration = (hours: number) => hours.toFixed(1);
  const formatElevation = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)}k` : Math.round(m).toString();
  const formatCalories = (cal: number) => cal >= 1000 ? `${(cal / 1000).toFixed(1)}k` : cal.toString();

  return (
    <InsightCard title={t('insights.summary.title')} icon="stats-chart">
      <View style={styles.statsGrid}>
        <StatBox
          label={t('insights.summary.activities')}
          value={data.total_count.toString()}
          icon="fitness-outline"
          colors={colors}
          isDark={isDark}
        />
        <StatBox
          label={t('insights.summary.distance')}
          value={`${formatDistance(data.total_distance_km)} km`}
          icon="navigate-outline"
          colors={colors}
          isDark={isDark}
        />
        <StatBox
          label={t('insights.summary.duration')}
          value={`${formatDuration(data.total_duration_hours)} h`}
          icon="time-outline"
          colors={colors}
          isDark={isDark}
        />
        <StatBox
          label={t('insights.summary.elevation')}
          value={`${formatElevation(data.total_elevation_m)} m`}
          icon="trending-up-outline"
          colors={colors}
          isDark={isDark}
        />
        <StatBox
          label={t('insights.summary.calories')}
          value={`${formatCalories(data.total_calories)} kcal`}
          icon="flame-outline"
          colors={colors}
          isDark={isDark}
        />
      </View>

      {data.by_sport_type && Object.keys(data.by_sport_type).length > 0 && (
        <View style={styles.sportsList}>
          <Text style={[styles.sportsTitle, { color: colors.textSecondary }]}>
            {t('insights.summary.bySport')}
          </Text>
          {Object.entries(data.by_sport_type).map(([sport, stats]) => (
            <View key={sport} style={[styles.sportRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sportName, { color: colors.textPrimary }]}>
                {t(`sports.${sport.toLowerCase()}`, sport)}
              </Text>
              <View style={styles.sportStats}>
                <Text style={[styles.sportStat, { color: colors.textSecondary }]}>
                  {stats.count}x
                </Text>
                <Text style={[styles.sportStat, { color: colors.textSecondary }]}>
                  {stats.total_distance_km.toFixed(1)} km
                </Text>
                <Text style={[styles.sportStat, { color: colors.textSecondary }]}>
                  {stats.total_duration_hours.toFixed(1)} h
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </InsightCard>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  sportsList: {
    marginTop: spacing.sm,
  },
  sportsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  sportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sportName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  sportStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sportStat: {
    fontSize: fontSize.sm,
  },
});