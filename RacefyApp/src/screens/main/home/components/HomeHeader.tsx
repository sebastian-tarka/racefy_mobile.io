import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, NotificationBadge } from '../../../../components';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing, borderRadius, fontSize, fontWeight } from '../../../../theme';

interface HomeHeaderProps {
  userName?: string;
  userAvatar?: string | null;
  greeting?: string;
  isAuthenticated: boolean;
  unreadCount?: number;
  onNotificationPress?: () => void;
  onAvatarPress?: () => void;
}

export function HomeHeader({ userName, userAvatar, greeting, isAuthenticated, unreadCount = 0, onNotificationPress, onAvatarPress }: HomeHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {isAuthenticated ? (
          <View style={styles.leftContent}>
            <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.7}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <Avatar uri={userAvatar} name={userName} size="lg" />
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.greetingContainer}>
              <Text style={[styles.greetingText, { color: colors.textSecondary }]}>
                {greeting || 'Hello'}
              </Text>
              <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                {userName || 'User'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.leftContent}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              Racefy
            </Text>
          </View>
        )}

        <View style={styles.rightActions}>
          <View style={styles.notificationContainer}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.cardBackground }]}
              onPress={onNotificationPress}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <NotificationBadge count={unreadCount} size="sm" />
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  avatarGradient: {
    borderRadius: borderRadius.full,
    padding: 2,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notificationContainer: {
    position: 'relative',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
});
