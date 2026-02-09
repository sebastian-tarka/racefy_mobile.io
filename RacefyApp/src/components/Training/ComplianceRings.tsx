import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import { Card } from '../../components';
import type { ComplianceData } from '../../types/api';

interface Props {
  compliance: ComplianceData;
}

function getRingColor(percentage: number): string {
  if (percentage >= 90) return '#10b981';
  if (percentage >= 70) return '#3b82f6';
  if (percentage >= 40) return '#f59e0b';
  return '#ef4444';
}

function ComplianceRing({
  percentage,
  completedLabel,
  suggestedLabel,
  title,
}: {
  percentage: number;
  completedLabel: string;
  suggestedLabel: string;
  title: string;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const ringColor = getRingColor(percentage);

  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (circumference * clampedPct) / 100;

  return (
    <View style={styles.ringContainer}>
      <View style={styles.svgWrapper}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.percentageOverlay}>
          <Text style={[styles.percentageText, { color: ringColor }]}>
            {Math.round(clampedPct)}%
          </Text>
        </View>
      </View>
      <Text style={[styles.ringSubtext, { color: colors.textSecondary }]}>
        {completedLabel} {t('training.feedback.compliance.of')} {suggestedLabel}
      </Text>
      <Text style={[styles.ringLabel, { color: colors.textPrimary }]}>
        {title}
      </Text>
    </View>
  );
}

export function ComplianceRings({ compliance }: Props) {
  const { t } = useTranslation();

  return (
    <Card style={styles.card}>
      <Text style={styles.hidden}>
        {/* Section title handled by parent */}
      </Text>
      <View style={styles.ringsRow}>
        <ComplianceRing
          percentage={compliance.sessions.percentage}
          completedLabel={String(compliance.sessions.completed)}
          suggestedLabel={String(compliance.sessions.suggested)}
          title={t('training.feedback.compliance.sessions')}
        />
        <ComplianceRing
          percentage={compliance.distance.percentage}
          completedLabel={`${compliance.distance.completed_km.toFixed(1)}`}
          suggestedLabel={`${compliance.distance.suggested_km.toFixed(1)} km`}
          title={t('training.feedback.compliance.distance')}
        />
        <ComplianceRing
          percentage={compliance.duration.percentage}
          completedLabel={compliance.duration.completed_formatted}
          suggestedLabel={compliance.duration.suggested_formatted}
          title={t('training.feedback.compliance.duration')}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  hidden: {
    height: 0,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ringContainer: {
    alignItems: 'center',
    flex: 1,
  },
  svgWrapper: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  percentageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  ringSubtext: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginBottom: 2,
  },
  ringLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
});
