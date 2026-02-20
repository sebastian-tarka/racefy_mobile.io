import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { triggerHaptic } from '../../hooks/useHaptics';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { ActivityMatch, MatchStatus } from '../../types/api';

interface Props {
  match: ActivityMatch;
  onPress?: (activityId: number) => void;
}

const STATUS_CONFIG: Record<MatchStatus, { color: string; icon: 'checkmark-circle' | 'alert-circle' | 'close-circle' }> = {
  completed: { color: '#10b981', icon: 'checkmark-circle' },
  partial: { color: '#f59e0b', icon: 'alert-circle' },
  missed: { color: '#ef4444', icon: 'close-circle' },
};

export function ActivityMatchCard({ match, onPress }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistanceShort, formatDistanceFromKm, getPaceUnit } = useUnits();
  const config = STATUS_CONFIG[match.status];
  const isTappable = match.matched_activity_id != null && onPress != null;

  const formatMatchDistance = (meters: number | null) => {
    if (!meters) return null;
    return formatDistanceShort(meters);
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const targetDistance = formatMatchDistance(match.suggested.target_distance_meters);
  const targetDuration = formatDuration(match.suggested.target_duration_minutes);

  const Wrapper = isTappable ? TouchableOpacity : View;
  const wrapperProps = isTappable
    ? { onPress: () => { triggerHaptic(); onPress(match.matched_activity_id!); }, activeOpacity: 0.7 }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <Text style={[styles.activityType, { color: colors.textPrimary }]}>
          {match.suggested.activity_type}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
          <Ionicons name={config.icon} size={14} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>
            {t(`training.feedback.activityMatching.${match.status}`)}
          </Text>
        </View>
      </View>

      {/* Targets */}
      <View style={styles.targetsRow}>
        {targetDistance && (
          <Text style={[styles.targetText, { color: colors.textSecondary }]}>
            {targetDistance}
          </Text>
        )}
        {targetDuration && (
          <Text style={[styles.targetText, { color: colors.textSecondary }]}>
            {targetDuration}
          </Text>
        )}
      </View>

      {/* Actual results */}
      {match.matched_activity_id ? (
        <View style={styles.actualRow}>
          {match.matched_distance_km != null && (
            <Text style={[styles.actualText, { color: colors.textPrimary }]}>
              {formatDistanceFromKm(match.matched_distance_km)}
            </Text>
          )}
          {match.matched_duration_formatted && (
            <Text style={[styles.actualText, { color: colors.textPrimary }]}>
              {match.matched_duration_formatted}
            </Text>
          )}
          {match.matched_pace != null && (
            <Text style={[styles.actualText, { color: colors.textSecondary }]}>
              {t('training.feedback.activityMatching.pace')}: {match.matched_pace.toFixed(2)} {getPaceUnit()}
            </Text>
          )}
          {isTappable && (
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.chevron} />
          )}
        </View>
      ) : (
        <Text style={[styles.noMatchText, { color: colors.textMuted }]}>
          {t('training.feedback.activityMatching.noMatch')}
        </Text>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activityType: {
    fontSize: fontSize.md,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  targetsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  targetText: {
    fontSize: fontSize.sm,
  },
  actualRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  actualText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  noMatchText: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  chevron: {
    marginLeft: 'auto',
  },
});
