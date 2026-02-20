import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../../hooks/useTheme';
import { useUnits } from '../../../../../hooks/useUnits';
import { spacing, fontSize, borderRadius } from '../../../../../theme';
import type { HomeSection } from '../../../../../types/api';

interface FriendActivitySectionProps {
  section: HomeSection;
  onPress?: () => void;
  onActivityPress?: (activityId: number) => void;
}

/**
 * Friend Activity section component.
 * Shows recent activities from friends.
 */
export function FriendActivitySection({ section, onPress, onActivityPress }: FriendActivitySectionProps) {
  const { colors } = useTheme();
  const { formatDistanceFromKm } = useUnits();

  const activities = section.friend_activities || [];

  if (activities.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.info + '20' }]}>
          <Ionicons name="people" size={24} color={colors.info} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {section.title}
          </Text>
          {section.message && (
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {section.message}
            </Text>
          )}
        </View>
        {section.cta && (
          <TouchableOpacity onPress={onPress}>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.activitiesList, { borderTopColor: colors.border }]}>
        {activities.slice(0, 3).map((activity, index) => (
          <TouchableOpacity
            key={activity.id}
            style={[
              styles.activityItem,
              index < activities.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
            ]}
            onPress={() => onActivityPress?.(activity.id)}
            activeOpacity={0.7}
          >
            {activity.user?.avatar_url ? (
              <Image source={{ uri: activity.user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                <Ionicons name="person" size={16} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.activityContent}>
              <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                {activity.user?.name || 'Unknown'}
              </Text>
              <Text style={[styles.activityStats, { color: colors.textSecondary }]} numberOfLines={1}>
                {activity.sport_type && `${activity.sport_type} • `}
                {activity.distance_km && formatDistanceFromKm(activity.distance_km)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  message: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  activitiesList: {
    borderTopWidth: 1,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  activityStats: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
