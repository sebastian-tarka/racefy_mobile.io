import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { InsightCard } from './InsightCard';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { MilestoneProgress } from '../../types/insights';

interface MilestonesCardProps {
  data: MilestoneProgress;
}

export function MilestonesCard({ data }: MilestonesCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  return (
    <InsightCard title={t('insights.milestones.title')} icon="trophy">
      {data.next_milestones.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('insights.milestones.upcoming')}
          </Text>
          {data.next_milestones.map((milestone, idx) => {
            const pct = Math.round(milestone.progress * 100);
            return (
              <View key={idx} style={styles.milestoneRow}>
                <View style={styles.milestoneHeader}>
                  <Text style={[styles.milestoneType, { color: colors.textPrimary }]}>
                    {milestone.type}
                  </Text>
                  <Text style={[styles.milestonePct, { color: colors.primary }]}>
                    {pct}%
                  </Text>
                </View>
                <View style={[styles.progressBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                {milestone.current !== undefined && (
                  <Text style={[styles.progressText, { color: colors.textMuted }]}>
                    {milestone.current} / {milestone.threshold}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {data.recently_achieved.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('insights.milestones.achieved')}
          </Text>
          <View style={styles.chipsRow}>
            {data.recently_achieved.map((achievement, idx) => (
              <View key={idx} style={[styles.chip, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)' }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={[styles.chipText, { color: colors.textPrimary }]}>{achievement.type}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </InsightCard>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  milestoneRow: {
    marginBottom: spacing.md,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  milestoneType: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  milestonePct: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  chipText: {
    fontSize: fontSize.sm,
  },
});
