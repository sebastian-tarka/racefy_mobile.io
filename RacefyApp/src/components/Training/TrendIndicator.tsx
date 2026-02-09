import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import { Card } from '../../components';
import type { TrendData } from '../../types/api';

interface Props {
  trends: TrendData;
}

function TrendRow({ label, changePct, direction }: {
  label: string;
  changePct: number | null;
  direction: string | null;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  if (changePct == null || direction == null) return null;

  let icon: keyof typeof Ionicons.glyphMap = 'arrow-forward';
  let color = colors.textMuted;

  if (direction === 'improving') {
    icon = 'arrow-up';
    color = '#10b981';
  } else if (direction === 'declining') {
    icon = 'arrow-down';
    color = '#ef4444';
  }

  return (
    <View style={styles.trendRow}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.trendLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.trendValue, { color }]}>
        {changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%
      </Text>
    </View>
  );
}

export function TrendIndicator({ trends }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (trends.vs_previous_week == null) {
    return (
      <Card style={styles.card}>
        <Text style={[styles.firstWeekText, { color: colors.textSecondary }]}>
          {t('training.feedback.trends.firstWeek')}
        </Text>
      </Card>
    );
  }

  let directionColor = colors.textMuted;
  let directionKey = 'maintaining';
  if (trends.vs_previous_week === 'improving') {
    directionColor = '#10b981';
    directionKey = 'improving';
  } else if (trends.vs_previous_week === 'declining') {
    directionColor = '#ef4444';
    directionKey = 'declining';
  }

  return (
    <Card style={styles.card}>
      <View style={styles.directionRow}>
        <Text style={[styles.vsLabel, { color: colors.textSecondary }]}>
          {t('training.feedback.trends.vsLastWeek')}
        </Text>
        <View style={[styles.directionBadge, { backgroundColor: directionColor + '15' }]}>
          <Text style={[styles.directionText, { color: directionColor }]}>
            {t(`training.feedback.trends.${directionKey}`)}
          </Text>
        </View>
      </View>

      <TrendRow
        label={t('training.feedback.trends.distance')}
        changePct={trends.distance_change_pct}
        direction={trends.vs_previous_week}
      />
      <TrendRow
        label={t('training.feedback.trends.duration')}
        changePct={trends.duration_change_pct}
        direction={trends.vs_previous_week}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  firstWeekText: {
    fontSize: fontSize.md,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  directionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  vsLabel: {
    fontSize: fontSize.sm,
  },
  directionBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  directionText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  trendLabel: {
    flex: 1,
    fontSize: fontSize.md,
  },
  trendValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
