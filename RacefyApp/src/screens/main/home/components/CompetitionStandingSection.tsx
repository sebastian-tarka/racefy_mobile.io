import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import { borderRadius, msFont, spacing } from '../../../../theme';
import type { BadgeReward, UserPointStats } from '../../../../types/api';

interface Props {
  stats: UserPointStats | null;
  /** Places gained this week since the last visit. */
  weeklyDelta: number | null;
  /** Badges the athlete has not opened yet. */
  newBadges: BadgeReward[];
  onOpenLeaderboard: () => void;
  onOpenRewards: () => void;
}

/**
 * The one competition line on Home (design "Racefy v2" → home competition
 * section).
 *
 * One section, not three: a fresh badge outranks a rank move, and a rank move
 * outranks a standing figure, so whichever is newest is the only one shown.
 * It renders nothing when there is nothing to say — Home does not need a
 * permanent scoreboard, it needs a reason to come back.
 *
 * The "close" wording only appears when the next place is actually within
 * reach: "12 pts to the next one" moves people, "340 pts" does not.
 */
export function CompetitionStandingSection({
  stats,
  weeklyDelta,
  newBadges,
  onOpenLeaderboard,
  onOpenRewards,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const fresh = newBadges[0];
  if (fresh) {
    return (
      <Card
        icon="ribbon"
        tint={colors.ai}
        tintSoft={colors.aiLight}
        title={t('home.competition.badgeTitle', { name: fresh.badge.name })}
        body={t('home.competition.badgeBody')}
        onPress={onOpenRewards}
      />
    );
  }

  if (!stats || stats.weekly_rank <= 0) return null;

  if (weeklyDelta != null && weeklyDelta !== 0) {
    const up = weeklyDelta > 0;
    return (
      <Card
        icon={up ? 'trending-up' : 'trending-down'}
        tint={up ? colors.primaryDark : colors.textSecondary}
        tintSoft={up ? colors.successLight : colors.background}
        title={t(up ? 'home.competition.movedUp' : 'home.competition.movedDown', {
          count: Math.abs(weeklyDelta),
        })}
        body={t('home.competition.rankNow', {
          rank: stats.weekly_rank.toLocaleString(),
          points: stats.weekly_points.toLocaleString(),
        })}
        onPress={onOpenLeaderboard}
      />
    );
  }

  // Standing still with nothing new to say. The design's third variant —
  // "12 pts to the next one" — needs the points of the athlete one place above,
  // which only the leaderboard endpoint knows; asking for it here would add a
  // request to Home's cold start for one line of copy. So the section stays
  // silent rather than repeating a rank the profile already shows.
  return null;
}

function Card({
  icon,
  tint,
  tintSoft,
  title,
  body,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  tintSoft: string;
  title: string;
  body: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      <View style={[styles.icon, { backgroundColor: tintSoft }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]} numberOfLines={2}>
          {body}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: msFont(13.5),
    fontWeight: '700',
  },
  text: {
    fontSize: msFont(11.5),
    marginTop: 1,
  },
});
