import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PremiumBadgeProps {
  tier?: 'plus' | 'pro';
  size?: number;
}

export function PremiumBadge({ tier = 'plus', size = 16 }: PremiumBadgeProps) {
  const color = tier === 'pro' ? '#A855F7' : '#10b981'; // purple for pro, emerald for plus

  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Ionicons name="diamond" size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    padding: 2,
    marginLeft: 4,
  },
});
