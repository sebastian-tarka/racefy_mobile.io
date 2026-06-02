import React from 'react';
import {type StyleProp, StyleSheet, Text, TouchableOpacity, View, type ViewStyle} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../hooks/useTheme';
import {borderRadius, fontSize, spacing} from '../../theme';
import type {TrainingProgram} from '../../types/api';

interface TrainingProgramRowProps {
  program: TrainingProgram;
  /** Highlight with a primary border and show the ACTIVE badge. */
  active?: boolean;
  /** Override the auto-generated "Week X of Y" subtitle. */
  subtitle?: string;
  /** Appended to the default "Week X of Y" subtitle as " · suffix" (ignored if `subtitle` is set). */
  subtitleSuffix?: string;
  /** Trailing slot (e.g. a chevron in the modal, a switch button on the profile). */
  trailing?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Overall program progress as completed weeks / total weeks.
 * The current week counts as in-progress (not done), matching the design
 * where "Week 13 of 16" shows 75% (12 of 16 weeks done).
 */
function computeProgress(program: TrainingProgram) {
  const total = program.total_weeks || 0;
  const currentWeek = program.current_week_number ?? 0;
  const weeksDone = Math.max(0, currentWeek - 1);
  const percent = total > 0 ? Math.min(100, Math.round((weeksDone / total) * 100)) : 0;
  return { total, currentWeek, percent };
}

/**
 * A single training-program row: icon tile, name (+ ACTIVE badge), subtitle and a
 * full-width progress bar with percentage. Shared between the profile screen card
 * and the training-plans bottom sheet so both stay visually identical.
 */
export function TrainingProgramRow({
  program,
  active = false,
  subtitle,
  subtitleSuffix,
  trailing,
  onPress,
  onLongPress,
  style,
}: TrainingProgramRowProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const { total, currentWeek, percent } = computeProgress(program);
  const defaultSubtitle =
    total > 0
      ? t('training.weekOfTotal', { current: Math.max(1, currentWeek), total })
      : program.template?.name ?? '';
  const sub =
    subtitle ?? (subtitleSuffix ? `${defaultSubtitle} · ${subtitleSuffix}` : defaultSubtitle);

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
          borderColor: active ? colors.primary : colors.borderLight,
        },
        style,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      disabled={!onPress && !onLongPress}
    >
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: colors.primary + '22' }]}>
          <Ionicons name="walk" size={20} color={colors.primary} />
        </View>

        <View style={styles.text}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {program.name}
            </Text>
            {active && (
              <View style={[styles.badge, { backgroundColor: colors.successLight }]}>
                <Text style={[styles.badgeText, { color: colors.success }]}>
                  {t('training.activeBadge')}
                </Text>
              </View>
            )}
          </View>
          {!!sub && (
            <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
              {sub}
            </Text>
          )}
        </View>

        {trailing}
      </View>

      <View style={styles.progressRow}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${percent}%` }]} />
        </View>
        <Text style={[styles.percent, { color: colors.textSecondary }]}>{percent}%</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  text: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  badge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sub: {
    fontSize: 11,
    marginTop: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  percent: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    minWidth: 38,
    textAlign: 'right',
  },
});