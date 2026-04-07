import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../hooks/useTheme';
import { avatarSizes } from '../theme';
import { TierBadge } from './TierBadge';
import type { SubscriptionTier } from '../types/api';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  /** Show subscription tier badge (plus/pro) on the avatar */
  showTierBadge?: boolean;
  /** Tier to display — required when showTierBadge is true */
  tier?: SubscriptionTier;
}

export function Avatar({ uri, name, size = 'md', showTierBadge, tier }: AvatarProps) {
  const { colors } = useTheme();
  const dimension = avatarSizes[size];
  const fontSizeValue = dimension * 0.4;

  const badgeSize = size === 'sm' ? 'sm' : 'md';
  const badge = showTierBadge && tier ? <TierBadge tier={tier} size={badgeSize} /> : null;

  const getInitial = () => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  if (uri) {
    return (
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri }}
          recyclingKey={uri}
          cachePolicy="memory-disk"
          style={[
            styles.image,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
              backgroundColor: colors.border,
            },
          ]}
        />
        {badge}
      </View>
    );
  }

  return (
    <View style={{ position: 'relative' }}>
      <View
        style={[
          styles.placeholder,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            backgroundColor: colors.primary,
          },
        ]}
      >
        <Text style={[styles.initial, { fontSize: fontSizeValue, color: colors.white }]}>{getInitial()}</Text>
      </View>
      {badge}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {},
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontWeight: '600',
  },
});
