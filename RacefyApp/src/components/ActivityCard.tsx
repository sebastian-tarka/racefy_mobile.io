import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { Activity } from '../types/api';

interface ActivityCardProps {
  activity: Activity;
  onPress?: () => void;
  showUser?: boolean;
}

export function ActivityCard({ activity, onPress, showUser = false }: ActivityCardProps) {
  const { colors } = useTheme();
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
          <View style={[styles.userHeader, { borderBottomColor: colors.borderLight }]}>
            <Avatar uri={activity.user.avatar} name={activity.user.name} size="sm" />
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.textPrimary }]}>{activity.user.name}</Text>
              <Text style={[styles.userDate, { color: colors.textSecondary }]}>{formattedDate}</Text>
            </View>
          </View>
        )}

        <View style={styles.header}>
          <View style={[styles.sportBadge, { backgroundColor: colors.primaryLight + '20' }]}>
            <Ionicons name={getSportIcon()} size={20} color={colors.primary} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {activity.title}
            </Text>
            <Text style={[styles.sportName, { color: colors.textSecondary }]}>
              {activity.sport_type?.name || 'Activity'}{!showUser ? ` · ${formattedDate}` : ''}
            </Text>
          </View>
        </View>

        <View style={[styles.statsContainer, { borderTopColor: colors.borderLight }]}>
          <View style={styles.statItem}>
            <Ionicons name="navigate-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatDistance(activity.distance)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Distance</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatDuration(activity.duration)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Duration</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.statItem}>
            <Ionicons name="speedometer-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {formatPace(activity.distance, activity.duration)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pace</Text>
          </View>
        </View>

        {(activity.elevation_gain != null && activity.elevation_gain > 0) ||
        (activity.calories != null && activity.calories > 0) ? (
          <View style={styles.secondaryStats}>
            {activity.elevation_gain != null && activity.elevation_gain > 0 ? (
              <View style={styles.secondaryStatItem}>
                <Ionicons name="trending-up" size={14} color={colors.textMuted} />
                <Text style={[styles.secondaryStatText, { color: colors.textMuted }]}>{activity.elevation_gain}m</Text>
              </View>
            ) : null}
            {activity.calories != null && activity.calories > 0 ? (
              <View style={styles.secondaryStatItem}>
                <Ionicons name="flame-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.secondaryStatText, { color: colors.textMuted }]}>{activity.calories} kcal</Text>
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
  },
  userInfo: {
    marginLeft: spacing.sm,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  userDate: {
    fontSize: fontSize.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sportBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
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
  },
  sportName: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
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
    marginLeft: spacing.xs,
  },
});
