import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InsightCard } from './InsightCard';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { TimePatterns } from '../../types/insights';

interface TimePatternsCardProps {
  data: TimePatterns;
}

const TIME_SLOT_KEYS: Record<string, string> = {
  early_morning: 'insights.timePatterns.earlyMorning',
  morning: 'insights.timePatterns.morning',
  midday: 'insights.timePatterns.midday',
  afternoon: 'insights.timePatterns.afternoon',
  evening: 'insights.timePatterns.evening',
  night: 'insights.timePatterns.night',
};

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_KEYS: Record<string, string> = {
  Monday: 'common.mon',
  Tuesday: 'common.tue',
  Wednesday: 'common.wed',
  Thursday: 'common.thu',
  Friday: 'common.fri',
  Saturday: 'common.sat',
  Sunday: 'common.sun',
};

export function TimePatternsCard({ data }: TimePatternsCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const maxHour = Math.max(...data.hour_distribution, 1);
  const maxDay = Math.max(...Object.values(data.day_distribution), 1);

  return (
    <InsightCard title={t('insights.timePatterns.title')} icon="time">
      <View style={styles.infoBoxes}>
        <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('insights.timePatterns.preferredTime')}</Text>
          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
            {t(TIME_SLOT_KEYS[data.preferred_time_slot] ?? data.preferred_time_slot)}
          </Text>
        </View>
        <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('insights.timePatterns.preferredDay')}</Text>
          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
            {t(DAY_KEYS[data.preferred_day] ?? data.preferred_day)}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('insights.timePatterns.hourDistribution')}
        </Text>
        <View style={styles.hourChart}>
          {data.hour_distribution.map((count, hour) => {
            const opacity = count > 0 ? Math.max(0.15, count / maxHour) : 0.05;
            return (
              <View
                key={hour}
                style={[
                  styles.hourBar,
                  {
                    backgroundColor: count > 0
                      ? `rgba(16, 185, 129, ${opacity})`
                      : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.hourLabels}>
          <Text style={[styles.hourLabel, { color: colors.textMuted }]}>0h</Text>
          <Text style={[styles.hourLabel, { color: colors.textMuted }]}>6h</Text>
          <Text style={[styles.hourLabel, { color: colors.textMuted }]}>12h</Text>
          <Text style={[styles.hourLabel, { color: colors.textMuted }]}>18h</Text>
          <Text style={[styles.hourLabel, { color: colors.textMuted }]}>23h</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('insights.timePatterns.dayDistribution')}
        </Text>
        {DAY_ORDER.map((day) => {
          const count = data.day_distribution[day] ?? 0;
          const width = maxDay > 0 ? (count / maxDay) * 100 : 0;
          return (
            <View key={day} style={styles.dayRow}>
              <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>
                {t(DAY_KEYS[day] ?? day)}
              </Text>
              <View style={[styles.dayBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                <View
                  style={[
                    styles.dayBarFill,
                    {
                      width: `${width}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.dayCount, { color: colors.textMuted }]}>{count}</Text>
            </View>
          );
        })}
      </View>

      <Text style={[styles.weekendText, { color: colors.textMuted }]}>
        {t('insights.timePatterns.weekend', { pct: data.weekend_pct })}
      </Text>
    </InsightCard>
  );
}

const styles = StyleSheet.create({
  infoBoxes: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoBox: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  hourChart: {
    flexDirection: 'row',
    gap: 2,
    height: 32,
    alignItems: 'flex-end',
  },
  hourBar: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
  },
  hourLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  hourLabel: {
    fontSize: 9,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dayLabel: {
    width: 32,
    fontSize: fontSize.xs,
  },
  dayBarBg: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  dayBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  dayCount: {
    width: 20,
    fontSize: fontSize.xs,
    textAlign: 'right',
  },
  weekendText: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
