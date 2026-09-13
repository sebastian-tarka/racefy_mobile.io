import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { msFont } from '../../theme';
import type { BadgeReward } from '../../types/api';

/** Fallback tints for the four tiers, used when the server sends no colour. */
const RARITY_FALLBACK: Record<BadgeReward['badge']['rarity'], string> = {
  common: '#64748b',
  rare: '#2563eb',
  epic: '#7c3aed',
  legendary: '#e0a106',
};

export function rarityColor(badge: BadgeReward['badge']): string {
  return badge.rarity_color || RARITY_FALLBACK[badge.rarity] || RARITY_FALLBACK.common;
}

interface Props {
  reward: BadgeReward;
  size?: 'sm' | 'md';
  onPress?: (reward: BadgeReward) => void;
}

/**
 * One badge in the cabinet (design "Racefy v2" → BadgeTile).
 *
 * `rarity_color` is the single place a colour outside the emerald system is
 * allowed — it arrives per badge from the server. Two tiers can land on
 * similar hues, so the tier is carried by ring weight and ground as well: a
 * legendary reads from the far side of the grid even in greyscale.
 */
export function BadgeTile({ reward, size = 'md', onPress }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const badge = reward.badge;
  const tint = rarityColor(badge);
  const legendary = badge.rarity === 'legendary';
  const epic = badge.rarity === 'epic';
  const d = size === 'sm' ? 54 : 64;

  const face = (
    <>
      {badge.icon_url ? (
        <Image source={{ uri: badge.icon_url }} style={{ width: d * 0.5, height: d * 0.5 }} />
      ) : (
        <Text style={{ fontSize: d * 0.44, lineHeight: d * 0.56 }}>
          {badge.icon_emoji || badge.icon || '🏅'}
        </Text>
      )}
    </>
  );

  const tileStyle = {
    width: d,
    height: d,
    borderRadius: 18,
    borderWidth: legendary ? 2.5 : epic ? 2 : 1,
    borderColor: legendary || epic ? tint : `${tint}3d`,
  };

  return (
    <TouchableOpacity
      style={styles.tile}
      onPress={onPress ? () => onPress(reward) : undefined}
      disabled={!onPress}
      activeOpacity={0.8}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${badge.name} · ${t(`rewards.rarity.${badge.rarity}`)}`}
    >
      <View>
        {legendary ? (
          <LinearGradient
            colors={[`${tint}2e`, `${tint}0a`]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[styles.face, tileStyle]}
          >
            {face}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.face,
              tileStyle,
              { backgroundColor: epic ? `${tint}1a` : colors.cardBackground },
            ]}
          >
            {face}
          </View>
        )}
        {reward.is_new && (
          <View
            style={[
              styles.newBadge,
              { backgroundColor: colors.error, borderColor: colors.background },
            ]}
          >
            <Text style={styles.newBadgeText}>{t('rewards.new')}</Text>
          </View>
        )}
      </View>

      <View style={styles.caption}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={2}>
          {badge.name}
        </Text>
        <Text style={[styles.rarity, { color: tint }]} numberOfLines={1}>
          {t(`rewards.rarity.${badge.rarity}`)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  newBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 2,
  },
  newBadgeText: {
    fontSize: msFont(8.5),
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#ffffff',
  },
  caption: {
    width: '100%',
  },
  name: {
    fontSize: msFont(11),
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: msFont(13),
  },
  rarity: {
    fontSize: msFont(9),
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 2,
  },
});
