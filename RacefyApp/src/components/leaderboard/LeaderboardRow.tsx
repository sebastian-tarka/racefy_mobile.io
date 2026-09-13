import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../Avatar';
import { useTheme } from '../../hooks/useTheme';
import { heroColors, msFont } from '../../theme';
import type { LeaderboardEntry } from '../../types/api';

/** Gold, silver, bronze — the only place the board leaves the emerald system. */
const MEDALS = ['#c9a227', '#98a2b3', '#b7791f'];

interface Props {
  entry: LeaderboardEntry;
  isMe?: boolean;
  /** Points needed to pass the athlete one place above. */
  gap?: number | null;
  /** Rendered as the pinned row at the bottom of the screen. */
  docked?: boolean;
  onPress?: (username: string) => void;
}

/**
 * One line of a leaderboard (design "Racefy v2" → LbRow).
 *
 * The same row in three states: a plain entry, the athlete's own entry
 * highlighted in place, and the docked copy that rides the bottom of the
 * screen while their true position is off-screen.
 */
export function LeaderboardRow({ entry, isMe, gap, docked, onPress }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const podium = entry.rank <= 3;
  const rankColor = docked
    ? heroColors.ink
    : podium
      ? MEDALS[entry.rank - 1]
      : isMe
        ? colors.primaryDark
        : colors.textSecondary;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        docked
          ? { backgroundColor: heroColors.bg, paddingVertical: 11 }
          : isMe
            ? { backgroundColor: colors.successLight }
            : null,
      ]}
      onPress={onPress ? () => onPress(entry.user.username) : undefined}
      disabled={!onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.rank,
          {
            color: rankColor,
            fontSize: msFont(podium ? 16 : 13.5),
            fontWeight: podium ? '600' : '500',
          },
        ]}
      >
        {entry.rank.toLocaleString()}
      </Text>

      <Avatar uri={entry.user.avatar} name={entry.user.name} size="sm" />

      <View style={styles.body}>
        <Text
          style={[
            styles.name,
            {
              color: docked ? heroColors.ink : colors.textPrimary,
              fontWeight: isMe ? '700' : '600',
            },
          ]}
          numberOfLines={1}
        >
          {isMe ? t('compete.you') : entry.user.name}
        </Text>
        {(isMe || docked) && (
          <Text
            style={[styles.sub, { color: docked ? heroColors.inkSoft : colors.primaryDark }]}
            numberOfLines={1}
          >
            {gap != null && gap >= 0
              ? t('compete.gapToNext', {
                  points: gap.toLocaleString(),
                  rank: (entry.rank - 1).toLocaleString(),
                })
              : `@${entry.user.username}`}
          </Text>
        )}
      </View>

      <View style={styles.points}>
        <Text style={[styles.pointsValue, { color: docked ? heroColors.ink : colors.textPrimary }]}>
          {entry.points.toLocaleString()}
        </Text>
        <Text
          style={[styles.pointsUnit, { color: docked ? heroColors.inkSoft : colors.textMuted }]}
        >
          {t('leaderboard.history.points')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rank: {
    minWidth: 34,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: msFont(13.5),
  },
  sub: {
    fontSize: msFont(11),
    marginTop: 1,
  },
  points: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  pointsValue: {
    fontSize: msFont(14),
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  pointsUnit: {
    fontSize: msFont(10.5),
  },
});
