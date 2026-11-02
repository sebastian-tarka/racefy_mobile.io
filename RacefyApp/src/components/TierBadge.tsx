import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { SubscriptionTier } from '../types/api';
import { msFont, type ThemeColors } from '../theme';

interface TierBadgeConfig {
  label: string;
  /** Theme token the badge is filled with. */
  tone: keyof Pick<ThemeColors, 'info' | 'warning'>;
}

const TIER_CONFIG: Record<SubscriptionTier, TierBadgeConfig | null> = {
  free: null,
  plus: { label: '+', tone: 'info' },
  pro: { label: 'P', tone: 'warning' },
};

const SIZES = {
  sm: { dimension: 12, fontSize: msFont(7), borderWidth: 1.5, bottom: -1, right: -1 },
  md: { dimension: 16, fontSize: msFont(9), borderWidth: 2, bottom: -2, right: -2 },
};

interface TierBadgeProps {
  tier: SubscriptionTier;
  /** sm=12px (lists), md=16px (profile/header) */
  size?: 'sm' | 'md';
}

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  const config = TIER_CONFIG[tier];
  const { colors } = useTheme();

  if (!config) return null;

  const s = SIZES[size];

  return (
    <View
      style={[
        styles.badge,
        {
          width: s.dimension,
          height: s.dimension,
          borderRadius: s.dimension / 2,
          backgroundColor: colors[config.tone],
          borderWidth: s.borderWidth,
          borderColor: colors.cardBackground,
          bottom: s.bottom,
          right: s.right,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.label, { fontSize: s.fontSize, color: colors.onPrimary }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
