import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/useTheme';
import { getNotificationIcon, getNotificationIconColor, getNotificationAvatarUrl } from '../hooks/useNotifications';
import { spacing, fontSize } from '../theme';
import type { Notification } from '../types/api';
import { API_BASE_URL } from '../config/api';

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
}

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const { colors } = useTheme();
  const data = notification.data?.data;
  const isUnread = !notification.read_at;

  if (!data) {
    return null;
  }

  const avatarUrl = getNotificationAvatarUrl(data.actor_avatar, API_BASE_URL);
  const iconName = getNotificationIcon(notification.type);
  const iconColor = getNotificationIconColor(notification.type);

  return (
    <TouchableOpacity
      onPress={() => onPress(notification)}
      style={[
        styles.container,
        { backgroundColor: isUnread ? colors.cardBackgroundHighlight : colors.cardBackground },
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Avatar uri={avatarUrl} name={data.actor_name} size="md" />
        <View style={[styles.iconBadge, { backgroundColor: iconColor }]}>
          <Ionicons name={iconName as any} size={14} color={colors.background} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.message, { color: colors.textPrimary }]}>
          <Text style={styles.actorName}>{data.actor_name}</Text>
          <Text style={{ color: colors.textSecondary }}> {notification.data.body}</Text>
        </Text>
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </Text>
      </View>

      {isUnread && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: fontSize.md,
    lineHeight: 20,
    marginBottom: 4,
  },
  actorName: {
    fontWeight: '600',
  },
  time: {
    fontSize: fontSize.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
});
