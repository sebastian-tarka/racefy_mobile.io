import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandLogo, Avatar } from '../../../../components';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing, borderRadius } from '../../../../theme';

interface HomeHeaderProps {
  userName?: string;
  userAvatar?: string | null;
  isAuthenticated: boolean;
  onNotificationPress?: () => void;
  onAvatarPress?: () => void;
}

export function HomeHeader({ userName, userAvatar, isAuthenticated, onNotificationPress, onAvatarPress }: HomeHeaderProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <BrandLogo category="logo-full" variant={isDark ? 'light' : 'dark'} width={140} height={40} />
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.cardBackground }]}
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          {isAuthenticated && (
            <TouchableOpacity
              onPress={onAvatarPress}
              activeOpacity={0.7}
            >
              <Avatar uri={userAvatar} name={userName} size="sm" />
            </TouchableOpacity>
          )}
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
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
