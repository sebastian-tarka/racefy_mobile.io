import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { InsightCard } from './InsightCard';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { WeatherProfile } from '../../types/insights';

interface WeatherCardProps {
  data: WeatherProfile;
}

const TEMP_ORDER = ['cold', 'cool', 'moderate', 'warm', 'hot'];

const CONDITION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  clear: 'sunny-outline',
  cloudy: 'cloudy-outline',
  rain: 'rainy-outline',
  snow: 'snow-outline',
  fog: 'cloud-outline',
  wind: 'flag-outline',
};

export function WeatherCard({ data }: WeatherCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const maxTemp = Math.max(...Object.values(data.temperature_distribution), 1);

  return (
    <InsightCard title={t('insights.weather.title')} icon="partly-sunny">
      <View style={[styles.prefBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
        <Text style={[styles.prefLabel, { color: colors.textSecondary }]}>
          {t('insights.weather.preferredTemp')}
        </Text>
        <Text style={[styles.prefValue, { color: colors.textPrimary }]}>
          {t(`insights.weather.temp.${data.preferred_temperature}`)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('insights.weather.tempDistribution')}
        </Text>
        {TEMP_ORDER.map((temp) => {
          const count = data.temperature_distribution[temp] ?? 0;
          const width = maxTemp > 0 ? (count / maxTemp) * 100 : 0;
          return (
            <View key={temp} style={styles.barRow}>
              <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
                {t(`insights.weather.temp.${temp}`)}
              </Text>
              <View style={[styles.barBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                <View
                  style={[styles.barFill, { width: `${width}%`, backgroundColor: colors.primary }]}
                />
              </View>
              <Text style={[styles.barCount, { color: colors.textMuted }]}>{count}</Text>
            </View>
          );
        })}
      </View>

      {Object.keys(data.top_conditions).length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('insights.weather.conditions')}
          </Text>
          <View style={styles.conditionsRow}>
            {Object.entries(data.top_conditions).map(([condition, count]) => (
              <View key={condition} style={[styles.conditionChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Ionicons
                  name={CONDITION_ICONS[condition] ?? 'ellipse-outline'}
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={[styles.conditionText, { color: colors.textPrimary }]}>
                  {t(`insights.weather.condition.${condition}`, condition)} ({count})
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </InsightCard>
  );
}

const styles = StyleSheet.create({
  prefBox: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  prefLabel: {
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  prefValue: {
    fontSize: fontSize.lg,
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
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  barLabel: {
    width: 60,
    fontSize: fontSize.xs,
  },
  barBg: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  barCount: {
    width: 24,
    fontSize: fontSize.xs,
    textAlign: 'right',
  },
  conditionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  conditionText: {
    fontSize: fontSize.sm,
  },
});
