import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { InsightCard } from './InsightCard';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { InsightsComparisons, SnapshotComparison } from '../../types/insights';

interface ComparisonCardProps {
  data: Partial<InsightsComparisons>;
}

function getDeltaColor(value: number, colors: ReturnType<typeof useTheme>['colors'], invert = false): string {
  if (value === 0) return colors.textMuted;
  const isGood = invert ? value < 0 : value > 0;
  return isGood ? colors.success : colors.error;
}

function formatDelta(value: number, suffix = '', invert = false): string {
  if (value === 0) return `0${suffix}`;
  if (invert) {
    // rank: negative = up (good), show as ↑N
    return value < 0 ? `↑${Math.abs(value)}` : `↓${value}`;
  }
  return `${value > 0 ? '+' : ''}${value}${suffix}`;
}

function ComparisonBlock({ label, comparison, colors, isDark }: {
  label: string;
  comparison: SnapshotComparison;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}) {
  const { t } = useTranslation();

  const deltas: { label: string; value: number; suffix: string; invert: boolean }[] = [];

  if (comparison.activity_count_change !== undefined) {
    deltas.push({ label: t('insights.comparison.activities'), value: comparison.activity_count_change, suffix: '', invert: false });
  }
  if (comparison.distance_change_pct !== undefined) {
    deltas.push({ label: t('insights.comparison.distance'), value: comparison.distance_change_pct, suffix: '%', invert: false });
  }
  if (comparison.streak_improvement !== undefined) {
    deltas.push({ label: t('insights.comparison.streak'), value: comparison.streak_improvement, suffix: '', invert: false });
  }
  if (comparison.rank_change !== undefined) {
    deltas.push({ label: t('insights.comparison.rank'), value: comparison.rank_change, suffix: '', invert: true });
  }

  return (
    <View style={[styles.block, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
      <Text style={[styles.blockLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.periodText, { color: colors.textMuted }]}>{comparison.period}</Text>
      {deltas.map((d) => (
        <View key={d.label} style={styles.deltaRow}>
          <Text style={[styles.deltaLabel, { color: colors.textSecondary }]}>{d.label}</Text>
          <Text style={[styles.deltaValue, { color: getDeltaColor(d.value, colors, d.invert) }]}>
            {formatDelta(d.value, d.suffix, d.invert)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ComparisonCard({ data }: ComparisonCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const blocks: { key: string; label: string; comparison: SnapshotComparison }[] = [];

  if (data.week_over_week) {
    blocks.push({ key: 'wow', label: t('insights.comparison.vsLastWeek'), comparison: data.week_over_week });
  }
  if (data.month_over_month) {
    blocks.push({ key: 'mom', label: t('insights.comparison.vsLastMonth'), comparison: data.month_over_month });
  }
  if (data.three_month) {
    blocks.push({ key: '3m', label: t('insights.comparison.vs3Months'), comparison: data.three_month });
  }

  if (blocks.length === 0) return null;

  return (
    <InsightCard title={t('insights.comparison.title')} icon="swap-vertical">
      <View style={styles.blocksContainer}>
        {blocks.map((b) => (
          <ComparisonBlock key={b.key} label={b.label} comparison={b.comparison} colors={colors} isDark={isDark} />
        ))}
      </View>
    </InsightCard>
  );
}

const styles = StyleSheet.create({
  blocksContainer: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  block: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  blockLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  periodText: {
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
  },
  deltaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  deltaLabel: {
    fontSize: fontSize.sm,
  },
  deltaValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
