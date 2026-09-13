import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RankDelta } from './RankDelta';
import { useTheme } from '../../hooks/useTheme';
import { heroColors, msFont, spacing } from '../../theme';
import type { UserPointStats } from '../../types/api';

interface Props {
  stats: UserPointStats | null;
  /** Places gained this week since the last visit; null when unknown. */
  weeklyDelta?: number | null;
  onPress: () => void;
}

/**
 * Where the athlete stands, on the identity card (design "Racefy v2" →
 * StandingBlock).
 *
 * Replaces the design's earlier "Level 12" pill, which promised a mechanic the
 * API does not have — there is no level and no XP, only the ranks the
 * leaderboard computes. Rank is current state, so it reads on a dark ground
 * against the lifetime Activities / Distance / Time row below it, which is
 * history.
 *
 * The hero ground is intentional and theme-independent, same as the recording
 * screen: it is one block that has to stay a block in both themes.
 */
export function StandingBlock({ stats, weeklyDelta = null, onPress }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const ranked = !!stats && (stats.weekly_rank > 0 || stats.global_rank > 0);

  if (!ranked) {
    return (
      <TouchableOpacity
        style={[styles.empty, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <View style={[styles.emptyIcon, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="trophy-outline" size={17} color={colors.primaryDark} />
        </View>
        <View style={styles.emptyText}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {t('compete.standing.notRanked')}
          </Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            {t('compete.standing.notRankedHint')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.block}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t('compete.standing.a11y', {
        rank: stats.weekly_rank,
        points: stats.weekly_points,
      })}
    >
      <View style={styles.column}>
        <Text style={styles.label}>{t('compete.standing.rankWeek')}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>#{stats.weekly_rank.toLocaleString()}</Text>
          <RankDelta delta={weeklyDelta} size="sm" onDark />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.column}>
        <Text style={styles.label}>{t('compete.standing.points')}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{stats.weekly_points.toLocaleString()}</Text>
          <Text style={styles.valueSuffix}>{t('compete.standing.thisWeek')}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={heroColors.inkSoft} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingVertical: 10,
    paddingLeft: 13,
    paddingRight: 12,
    borderRadius: 14,
    backgroundColor: heroColors.bg,
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: heroColors.track,
  },
  label: {
    fontSize: msFont(9.5),
    fontWeight: '600',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: heroColors.inkSoft,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs + 2,
    marginTop: 2,
  },
  value: {
    fontSize: msFont(19),
    fontWeight: '500',
    color: heroColors.ink,
    fontVariant: ['tabular-nums'],
  },
  valueSuffix: {
    fontSize: msFont(11),
    color: heroColors.inkSoft,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: spacing.md,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    flex: 1,
    minWidth: 0,
  },
  emptyTitle: {
    fontSize: msFont(13),
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: msFont(11.5),
    marginTop: 1,
  },
});
