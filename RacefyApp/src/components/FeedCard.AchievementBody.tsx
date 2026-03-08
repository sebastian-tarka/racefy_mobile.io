import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import { fixStorageUrl } from '../config/api';
import type { Post } from '../types/api';

const RARITY_CONFIG: Record<string, { border: string; background: string }> = {
  legendary: { border: '#F97316', background: 'rgba(249,115,22,0.1)' },
  epic:      { border: '#9333EA', background: 'rgba(147,51,234,0.1)' },
  rare:      { border: '#3B82F6', background: 'rgba(59,130,246,0.1)' },
  common:    { border: '#6B7280', background: 'rgba(107,114,128,0.1)' },
};

interface AchievementBodyProps {
  post: Post;
}

export function AchievementBody({ post }: AchievementBodyProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const achievement = post.achievement;
  if (!achievement) return null;

  const badge = achievement.badge;
  const rarityConfig = RARITY_CONFIG[badge.rarity] || RARITY_CONFIG.common;
  const iconUrl = badge.icon_url ? fixStorageUrl(badge.icon_url) : null;

  return (
    <View style={styles.container}>
      <View style={[styles.card, { borderColor: rarityConfig.border, backgroundColor: rarityConfig.background }]}>
        <View style={styles.row}>
          <View style={[styles.iconContainer, { borderColor: rarityConfig.border }]}>
            {iconUrl ? (
              <Image source={{ uri: iconUrl }} style={styles.iconImage} resizeMode="contain" />
            ) : (
              <Text style={styles.iconEmoji}>{badge.icon || '🏅'}</Text>
            )}
          </View>

          <View style={styles.content}>
            <Text style={[styles.badgeName, { color: colors.textPrimary }]} numberOfLines={2}>
              {badge.name}
            </Text>
            <View style={[styles.rarityBadge, { backgroundColor: rarityConfig.border + '22', borderColor: rarityConfig.border }]}>
              <Text style={[styles.rarityText, { color: rarityConfig.border }]}>
                {t(`feed.achievement.rarity.${badge.rarity}`)}
              </Text>
            </View>
            {!!badge.description && (
              <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
                {badge.description}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconImage: {
    width: 48,
    height: 48,
  },
  iconEmoji: {
    fontSize: 32,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  badgeName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  rarityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginTop: 2,
  },
  rarityText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});