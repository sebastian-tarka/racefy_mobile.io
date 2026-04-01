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
import { useUnits } from '../hooks/useUnits';
import { spacing, fontSize, borderRadius } from '../theme';
import { formatDurationCompact } from '../utils/formatDuration';
import { getSportTheme } from '../utils/sportTheme';
import type { Activity } from '../types/api';

interface ActivityCompactCardProps {
  activity: Activity;
  onPress?: () => void;
  isAuthenticated?: boolean;
}


export function ActivityCompactCard({
  activity,
  onPress,
  isAuthenticated = true,
}: ActivityCompactCardProps) {
  const { colors } = useTheme();
  const { formatDistanceShort } = useUnits();
  const sportTheme = getSportTheme(activity.sport_type?.name);
  const sportColor = sportTheme.color;

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
        <Ionicons name={sportTheme.icon} size={18} color={sportColor} />
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
              {formatDistanceShort(activity.distance)}
            </Text>
          </View>
          <View style={[styles.statDot, { backgroundColor: colors.textMuted }]} />
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {formatDurationCompact(activity.duration)}
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