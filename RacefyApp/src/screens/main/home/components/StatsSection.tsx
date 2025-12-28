import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '../../../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface Stat {
  icon: IconName;
  value: string;
  labelKey: string;
}

interface StatsSectionProps {
  stats?: Stat[];
}

const defaultStats: Stat[] = [
  { icon: 'people', value: '10K+', labelKey: 'home.stats.users' },
  { icon: 'calendar', value: '500+', labelKey: 'home.stats.events' },
  { icon: 'trophy', value: '50K+', labelKey: 'home.stats.activities' },
];

export function StatsSection({ stats = defaultStats }: StatsSectionProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {stats.map((stat, index) => (
        <View key={index} style={styles.statItem}>
          <Ionicons name={stat.icon} size={24} color={colors.primary} />
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{t(stat.labelKey)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xl,
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
