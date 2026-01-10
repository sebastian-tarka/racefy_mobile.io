import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { fontSize } from '../theme';

interface NotificationBadgeProps {
  count: number;
  size?: 'sm' | 'md';
}

export function NotificationBadge({ count, size = 'md' }: NotificationBadgeProps) {
  const { colors } = useTheme();

  if (count === 0) return null;

  const badgeSize = size === 'sm' ? 16 : 20;
  const textSize = size === 'sm' ? 10 : 12;
  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.error,
          minWidth: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: colors.white,
            fontSize: textSize,
          },
        ]}
      >
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
