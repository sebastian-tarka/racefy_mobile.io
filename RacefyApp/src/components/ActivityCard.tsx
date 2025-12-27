import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import type { Activity } from '../types/api';

interface ActivityCardProps {
  activity: Activity;
  onPress?: () => void;
  showUser?: boolean;
}

export function ActivityCard({ activity, onPress, showUser = false }: ActivityCardProps) {
  const formattedDate = format(new Date(activity.started_at), 'MMM d, yyyy');

  const getSportIcon = (): keyof typeof Ionicons.glyphMap => {
    const sportName = activity.sport_type?.name?.toLowerCase() || '';
    if (sportName.includes('run')) return 'walk-outline';
    if (sportName.includes('cycling') || sportName.includes('bike')) return 'bicycle-outline';
    if (sportName.includes('swim')) return 'water-outline';
    if (sportName.includes('gym') || sportName.includes('fitness')) return 'barbell-outline';
    if (sportName.includes('yoga')) return 'body-outline';
    return 'fitness-outline';
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters} m`;
  };

  const formatPace = (meters: number, seconds: number): string => {
    if (meters === 0) return '-';
    const paceSecondsPerKm = (seconds / meters) * 1000;
    const paceMinutes = Math.floor(paceSecondsPerKm / 60);
    const paceSeconds = Math.floor(paceSecondsPerKm % 60);
    return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} /km`;
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} disabled={!onPress}>
      <Card>
        {showUser && activity.user && (
          <View style={styles.userHeader}>
            <Avatar uri={activity.user.avatar} name={activity.user.name} size="sm" />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{activity.user.name}</Text>
              <Text style={styles.userDate}>{formattedDate}</Text>
            </View>
          </View>
        )}

        <View style={styles.header}>
          <View style={styles.sportBadge}>
            <Ionicons name={getSportIcon()} size={20} color={colors.primary} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {activity.title}
            </Text>
            <Text style={styles.sportName}>
              {activity.sport_type?.name || 'Activity'}{!showUser ? ` · ${formattedDate}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="navigate-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.statValue}>{formatDistance(activity.distance)}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.statValue}>{formatDuration(activity.duration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="speedometer-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.statValue}>
              {formatPace(activity.distance, activity.duration)}
            </Text>
            <Text style={styles.statLabel}>Pace</Text>
          </View>
        </View>

        {(activity.elevation_gain != null && activity.elevation_gain > 0) ||
        (activity.calories != null && activity.calories > 0) ? (
          <View style={styles.secondaryStats}>
            {activity.elevation_gain != null && activity.elevation_gain > 0 ? (
              <View style={styles.secondaryStatItem}>
                <Ionicons name="trending-up" size={14} color={colors.textMuted} />
                <Text style={styles.secondaryStatText}>{activity.elevation_gain}m</Text>
              </View>
            ) : null}
            {activity.calories != null && activity.calories > 0 ? (
              <View style={styles.secondaryStatItem}>
                <Ionicons name="flame-outline" size={14} color={colors.textMuted} />
                <Text style={styles.secondaryStatText}>{activity.calories} kcal</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  userInfo: {
    marginLeft: spacing.sm,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  userDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sportBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sportName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  secondaryStats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  secondaryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryStatText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
});
