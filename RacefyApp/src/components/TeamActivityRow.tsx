import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useUnits } from '../hooks/useUnits';
import { Avatar } from './Avatar';
import { fixStorageUrl } from '../config/api';
import { formatTimeAgo } from '../utils/dateFormat';
import { formatTotalTime } from '../utils/formatters';
import { borderRadius, fontSize, spacing } from '../theme';
import type { TeamBoardActivity } from '../types/api';

interface TeamActivityRowProps {
  activity: TeamBoardActivity;
  onPress: (activityId: number) => void;
  /** Hairline under the row; off for the last one. */
  showDivider?: boolean;
}

/**
 * One row of the team activity board: who, what sport and when, the title, the
 * numbers that matter (distance / time / pace / climb), reactions and the route
 * thumbnail. Pace follows the user's units; the API's metric `formatted.pace`
 * only says whether pace applies to this activity at all.
 */
export const TeamActivityRow = React.memo(function TeamActivityRow({
  activity,
  onPress,
  showDivider = true,
}: TeamActivityRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistanceShort, formatElevation, formatPaceWithUnit } = useUnits();

  const meta = [activity.sport_type?.name, formatTimeAgo(activity.started_at)]
    .filter(Boolean)
    .join(' · ');

  const pace = useMemo(() => {
    const applies = activity.formatted?.pace ? activity.formatted.pace.value !== null : true;
    const seconds = activity.moving_time ?? activity.duration;
    if (!applies || activity.distance <= 0 || seconds <= 0) return null;
    const text = formatPaceWithUnit(activity.distance, seconds);
    return text.startsWith('--') ? null : text;
  }, [activity, formatPaceWithUnit]);

  const stats = [
    activity.distance > 0 ? formatDistanceShort(activity.distance) : null,
    activity.duration > 0 ? formatTotalTime(activity.duration) : null,
    pace,
    activity.elevation_gain && activity.elevation_gain > 0
      ? `↗ ${formatElevation(activity.elevation_gain)}`
      : null,
  ].filter((s): s is string => !!s);

  const preview = fixStorageUrl(activity.route_preview_url || activity.route_map_url || null);
  const hasReactions = activity.likes_count > 0 || activity.comments_count > 0;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        showDivider && {
          borderBottomColor: colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
      onPress={() => onPress(activity.id)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('teamBoard.openActivity')}
      testID={`team-activity-${activity.id}`}
    >
      <Avatar
        uri={activity.user?.avatar}
        variants={activity.user?.avatar_variants}
        name={activity.user?.name}
        size="md"
      />
      <View style={styles.body}>
        <View style={styles.head}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {activity.user?.name}
          </Text>
          {!!meta && (
            <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
              {meta}
            </Text>
          )}
        </View>
        {!!activity.title && (
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {activity.title}
          </Text>
        )}
        {stats.length > 0 && (
          <View style={styles.stats}>
            {stats.map((value, index) => (
              <Text
                key={`${activity.id}-${index}`}
                style={[styles.stat, { color: index < 2 ? colors.textPrimary : colors.textMuted }]}
              >
                {value}
              </Text>
            ))}
          </View>
        )}
        {hasReactions && (
          <View
            style={styles.reactions}
            accessibilityLabel={t('teamBoard.reactions', {
              likes: activity.likes_count,
              comments: activity.comments_count,
            })}
          >
            {activity.likes_count > 0 && (
              <View style={styles.reaction}>
                <Ionicons name="heart-outline" size={13} color={colors.textMuted} />
                <Text style={[styles.reactionText, { color: colors.textMuted }]}>
                  {activity.likes_count}
                </Text>
              </View>
            )}
            {activity.comments_count > 0 && (
              <View style={styles.reaction}>
                <Ionicons name="chatbubble-outline" size={13} color={colors.textMuted} />
                <Text style={[styles.reactionText, { color: colors.textMuted }]}>
                  {activity.comments_count}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
      {preview && (
        <Image
          source={{ uri: preview }}
          style={[styles.preview, { backgroundColor: colors.background }]}
          contentFit={activity.route_preview_url ? 'contain' : 'cover'}
          cachePolicy="memory-disk"
          accessibilityIgnoresInvertColors
        />
      )}
    </TouchableOpacity>
  );
});

const PREVIEW_SIZE = 64;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm + spacing.xs,
  },
  body: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  name: { fontSize: fontSize.sm, fontWeight: '700', flexShrink: 1 },
  meta: { fontSize: fontSize.xs, flexShrink: 1 },
  title: { fontSize: fontSize.sm, marginTop: 2 },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: 2,
    marginTop: spacing.xs + 2,
  },
  stat: { fontSize: fontSize.sm, fontVariant: ['tabular-nums'], fontWeight: '600' },
  reactions: { flexDirection: 'row', gap: spacing.sm + spacing.xs, marginTop: spacing.xs },
  reaction: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reactionText: { fontSize: fontSize.xs },
  preview: { width: PREVIEW_SIZE, height: PREVIEW_SIZE, borderRadius: borderRadius.md },
});
