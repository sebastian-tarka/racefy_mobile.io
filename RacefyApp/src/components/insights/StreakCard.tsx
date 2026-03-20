import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InsightCard } from './InsightCard';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { StreakData } from '../../types/insights';

interface StreakCardProps {
  data: StreakData;
}

function MiniStatBox({ label, value, colors, isDark }: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}) {
  return (
    <View style={[styles.miniBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
      <Text style={[styles.miniValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function StreakCard({ data }: StreakCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const consistency = data.weekly_consistency ?? 0;

  return (
    <InsightCard title={t('insights.streak.title')} icon="flame">
      <View style={styles.grid}>
        <MiniStatBox
          label={t('insights.streak.current')}
          value={`${data.current_streak} ${t('insights.streak.days')}`}
          colors={colors}
          isDark={isDark}
        />
        <MiniStatBox
          label={t('insights.streak.longest')}
          value={`${data.longest_streak} ${t('insights.streak.days')}`}
          colors={colors}
          isDark={isDark}
        />
        <MiniStatBox
          label={t('insights.streak.thisWeek')}
          value={data.activities_this_week.toString()}
          colors={colors}
          isDark={isDark}
        />
        <MiniStatBox
          label={t('insights.streak.thisMonth')}
          value={data.activities_this_month.toString()}
          colors={colors}
          isDark={isDark}
        />
      </View>

      <View style={styles.consistencySection}>
        <Text style={[styles.consistencyLabel, { color: colors.textSecondary }]}>
          {t('insights.streak.consistency')}
        </Text>
        <View style={styles.consistencyBar}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.consistencySegment,
                {
                  backgroundColor: i < consistency
                    ? colors.primary
                    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.consistencyText, { color: colors.textMuted }]}>
          {consistency} / 4 {t('insights.streak.weeks')}
        </Text>
      </View>

      {data.total_active_days !== undefined && (
        <Text style={[styles.activeDays, { color: colors.textMuted }]}>
          {t('insights.streak.totalActiveDays', { count: data.total_active_days })}
        </Text>
      )}
    </InsightCard>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  miniBox: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  miniValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  miniLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
    textAlign: 'center',
  },
  consistencySection: {
    marginBottom: spacing.sm,
  },
  consistencyLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  consistencyBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  consistencySegment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  consistencyText: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  activeDays: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
