import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import type { WorkoutPlanStatus } from '../../../types/workouts';
import { borderRadius, fontSize, spacing } from '../../../theme';

export function PlanStatusPill({ status }: { status: WorkoutPlanStatus }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const color =
    status === 'active' ? colors.primary : status === 'draft' ? colors.warning : colors.textMuted;
  return (
    <View style={[styles.pill, { backgroundColor: color + '1F' }]}>
      <Text style={[styles.text, { color }]}>{t(`strengthPlans.status.${status}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
