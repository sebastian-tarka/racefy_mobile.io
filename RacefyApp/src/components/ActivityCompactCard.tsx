import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { Activity } from '../types/api';

interface ActivityCompactCardProps {
  activity: Activity;
  onPress?: () => void;
  isAuthenticated?: boolean;
}

const getSportIcon = (sportName?: string): keyof typeof Ionicons.glyphMap => {
  if (!sportName) return 'fitness';
  const name = sportName.toLowerCase();

  if (name.includes('run') || name.includes('jog')) return 'walk';
  if (name.includes('cycl') || name.includes('bike')) return 'bicycle';
  if (name.includes('swim')) return 'water';
  if (name.includes('gym') || name.includes('weight') || name.includes('fitness')) return 'barbell';
  if (name.includes('yoga') || name.includes('pilates')) return 'body';
  if (name.includes('hik') || name.includes('walk') || name.includes('trek')) return 'trail-sign';

  return 'fitness';
};

const getSportColor = (sportName?: string): string => {
  if (!sportName) return '#6366f1';
  const name = sportName.toLowerCase();

  if (name.includes('run') || name.includes('jog')) return '#10b981';
  if (name.includes('cycl') || name.includes('bike')) return '#3b82f6';
  if (name.includes('swim')) return '#06b6d4';
  if (name.includes('gym') || name.includes('weight') || name.includes('fitness')) return '#f97316';
  if (name.includes('yoga') || name.includes('pilates')) return '#a855f7';
  if (name.includes('hik') || name.includes('walk') || name.includes('trek')) return '#84cc16';

  return '#6366f1';
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
};

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
};

export function ActivityCompactCard({
  activity,
  onPress,
  isAuthenticated = true,
}: ActivityCompactCardProps) {
  const { colors } = useTheme();
  const sportColor = getSportColor(activity.sport_type?.name);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderLight,
        },
      ]}
    >
      {/* Sport color accent */}
      <View style={[styles.sportAccent, { backgroundColor: sportColor }]} />

      {/* Sport icon */}
      <View style={[styles.sportIcon, { backgroundColor: sportColor + '15' }]}>
        <Ionicons name={getSportIcon(activity.sport_type?.name)} size={18} color={sportColor} />
      </View>

      {/* Activity info */}
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {activity.title}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="navigate-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {formatDistance(activity.distance)}
            </Text>
          </View>
          <View style={[styles.statDot, { backgroundColor: colors.textMuted }]} />
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {formatDuration(activity.duration)}
            </Text>
          </View>
        </View>
      </View>

      {/* User avatar */}
      {activity.user && (
        <View style={styles.avatarContainer}>
          <Avatar
            uri={activity.user.avatar}
            name={activity.user.name}
            size="sm"
          />
        </View>
      )}

      {/* Lock icon for non-authenticated */}
      {!isAuthenticated && (
        <View style={[styles.lockIcon, { backgroundColor: colors.textMuted + '20' }]}>
          <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingLeft: spacing.md + 3,
    overflow: 'hidden',
  },
  sportAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.lg,
  },
  sportIcon: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  info: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: fontSize.xs,
    marginLeft: 3,
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: spacing.xs,
  },
  avatarContainer: {
    marginLeft: spacing.xs,
  },
  lockIcon: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
});