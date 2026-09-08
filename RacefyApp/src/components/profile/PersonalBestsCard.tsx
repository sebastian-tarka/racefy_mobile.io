import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { formatDurationCompact } from '../../utils/formatDuration';
import { borderRadius, fontSize, msFont, spacing } from '../../theme';
import type { ActivityStats } from '../../types/api';

interface Props {
  stats: ActivityStats | null;
  onOpenActivity?: (activityId: number) => void;
}

/**
 * The bests the API keeps (design "Racefy v2" → RecordsGrid).
 *
 * The design shows six records including 5 km / 10 km / half splits; the API
 * exposes three — longest distance, longest duration, fastest speed — so those
 * are what this shows. Each tile opens the activity that set it, which is the
 * question anyone asks next.
 */
export function PersonalBestsCard({ stats, onOpenActivity }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatDistance, formatSpeed } = useUnits();

  const bests = stats?.bests;
  const tiles = [
    bests?.longest_distance && {
      key: 'distance' as const,
      icon: 'resize-outline' as const,
      label: t('profile.stats.bests.longestDistance'),
      value: formatDistance(bests.longest_distance.distance ?? 0),
      best: bests.longest_distance,
    },
    bests?.longest_duration && {
      key: 'duration' as const,
      icon: 'time-outline' as const,
      label: t('profile.stats.bests.longestDuration'),
      value: formatDurationCompact(bests.longest_duration.duration ?? 0),
      best: bests.longest_duration,
    },
    bests?.fastest_speed && {
      key: 'speed' as const,
      icon: 'flash-outline' as const,
      label: t('profile.stats.bests.fastestSpeed'),
      value: formatSpeed(bests.fastest_speed.max_speed ?? 0),
      best: bests.fastest_speed,
    },
  ].filter(Boolean) as {
    key: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    value: string;
    best: { id: number; title: string; date: string };
  }[];

  if (tiles.length === 0) return null;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
    >
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('profile.stats.bests.title')}
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          {t('profile.stats.bests.inPeriod')}
        </Text>
      </View>

      <View style={styles.grid}>
        {tiles.map((tile) => (
          <TouchableOpacity
            key={tile.key}
            style={[styles.tile, { backgroundColor: colors.background }]}
            onPress={() => onOpenActivity?.(tile.best.id)}
            disabled={!onOpenActivity}
            activeOpacity={0.8}
            accessibilityLabel={`${tile.label}: ${tile.value}. ${tile.best.title}`}
          >
            <View style={styles.tileHead}>
              <Ionicons name={tile.icon} size={13} color={colors.primary} />
              <Text style={[styles.tileLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {tile.label.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.tileValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {tile.value}
            </Text>
            <Text style={[styles.tileMeta, { color: colors.textMuted }]} numberOfLines={1}>
              {tile.best.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  hint: {
    fontSize: fontSize.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  tileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
  },
  tileLabel: {
    flex: 1,
    fontSize: msFont(10),
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  tileValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xs,
  },
  tileMeta: {
    fontSize: msFont(10),
    marginTop: 1,
  },
});
