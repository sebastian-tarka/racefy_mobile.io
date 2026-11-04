import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../hooks/useTheme';
import { avatarSizes } from '../theme';
import { TierBadge } from './TierBadge';
import type { ImageVariants, SubscriptionTier } from '../types/api';
import { AVATAR_LADDER, pickVariantForWidth } from '../utils/imageVariants';

interface AvatarProps {
  /** Original avatar URL — the fallback when no variant fits. */
  uri?: string | null;
  /**
   * `avatar_variants` from the API (`thumb` 50 / `small` 100 / `medium` 200 crops). The
   * smallest copy covering the rendered size on this screen is loaded instead of the original.
   */
  variants?: ImageVariants | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  /** Show subscription tier badge (plus/pro) on the avatar */
  showTierBadge?: boolean;
  /** Tier to display — required when showTierBadge is true */
  tier?: SubscriptionTier;
}

export function Avatar({ uri, variants, name, size = 'md', showTierBadge, tier }: AvatarProps) {
  const { colors } = useTheme();
  const dimension = avatarSizes[size];
  const fontSizeValue = dimension * 0.4;
  const source = pickVariantForWidth(variants, dimension, AVATAR_LADDER, uri);

  const badgeSize = size === 'sm' ? 'sm' : 'md';
  const badge = showTierBadge && tier ? <TierBadge tier={tier} size={badgeSize} /> : null;

  const getInitial = () => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  if (source) {
    return (
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: source }}
          recyclingKey={source}
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
        <Text style={[styles.initial, { fontSize: fontSizeValue, color: colors.white }]}>
          {getInitial()}
        </Text>
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
