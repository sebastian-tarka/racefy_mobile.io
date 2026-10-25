import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../../../components';
import { useTheme } from '../../../../hooks/useTheme';
import { useUnits } from '../../../../hooks/useUnits';
import { borderRadius, msFont, spacing } from '../../../../theme';
import type { FriendTodayActivity } from '../../../../types/api';
import { sportColor } from '../../../../utils/sportColor';
import { getSportIcon } from '../../../../utils/sportIcon';

interface Props {
  rows: FriendTodayActivity[];
  /** Every friend active today — more than `rows` when the list is cut. */
  friendsCount: number;
  onOpenActivity: (activityId: number) => void;
  onOpenFeed: () => void;
}

/** "32 min", "1h 14m". */
function shortDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/**
 * "Friends today" (design "Racefy v2" → FriendsPreview): one compact row per
 * followed athlete who trained today, newest first. Renders nothing on a day
 * nobody has — an empty card would only say "your friends are lazy".
 */
export function FriendsTodayCard({ rows, friendsCount, onOpenActivity, onOpenFeed }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatDistance } = useUnits();

  if (rows.length === 0) return null;
  const more = friendsCount - rows.length;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {t('home.friendsToday.title')}
        </Text>
        <TouchableOpacity onPress={onOpenFeed} hitSlop={8} accessibilityRole="link">
          <Text style={[styles.link, { color: colors.primaryDark }]}>
            {more > 0
              ? t('home.friendsToday.seeFeedMore', { count: more })
              : t('home.friendsToday.seeFeed')}
          </Text>
        </TouchableOpacity>
      </View>

      {rows.map((row) => {
        // Strength has no distance: its tonnage is the number worth showing.
        const value = row.strength
          ? `${Math.round(row.strength.volume_kg).toLocaleString()} kg`
          : row.distance > 0
            ? formatDistance(row.distance)
            : shortDuration(row.duration);
        return (
          <TouchableOpacity
            key={row.activity_id}
            style={[styles.row, { borderTopColor: colors.border }]}
            onPress={() => onOpenActivity(row.activity_id)}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Avatar uri={row.user.avatar_url} name={row.user.name} size="md" />
            <View style={styles.rowBody}>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {row.user.name}
              </Text>
              <View style={styles.metaRow}>
                <Ionicons
                  name={getSportIcon(row.sport_type.slug || row.sport_type.name)}
                  size={12}
                  color={sportColor(row.sport_type)}
                />
                <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                  {row.title} · {shortDuration(row.duration)}
                </Text>
              </View>
            </View>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md + 2,
    paddingBottom: spacing.sm,
  },
  heading: {
    fontSize: msFont(16),
    fontWeight: '700',
  },
  link: {
    fontSize: msFont(12),
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: msFont(13),
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  meta: {
    flex: 1,
    fontSize: msFont(11),
  },
  value: {
    fontSize: msFont(13),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
