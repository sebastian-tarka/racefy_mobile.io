import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Card } from './Card';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { spacing, fontSize, borderRadius } from '../theme';
import type { Reward, RewardType } from '../types/api';

interface RewardCardProps {
  reward: Reward;
  onPress?: () => void;
}

const getRewardIcon = (type: RewardType): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'points':
      return 'star';
    case 'coupon':
      return 'ticket';
    case 'badge':
      return 'medal';
    case 'prize':
      return 'gift';
    default:
      return 'gift';
  }
};

const getRewardColor = (type: RewardType, colors: any): string => {
  switch (type) {
    case 'points':
      return colors.warning;
    case 'coupon':
      return colors.success;
    case 'badge':
      return colors.primary;
    case 'prize':
      return colors.orange;
    default:
      return colors.primary;
  }
};

const getBadgeRarityColor = (rarity: string, colors: any): string => {
  switch (rarity) {
    case 'legendary':
      return colors.warning; // Gold/Orange from theme
    case 'epic':
      return '#a855f7'; // Purple - works in both modes
    case 'rare':
      return colors.info; // Blue from theme
    case 'common':
      return colors.textSecondary; // Gray from theme
    default:
      return colors.textSecondary;
  }
};

export function RewardCard({ reward, onPress }: RewardCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const formattedDate = format(new Date(reward.earned_at), 'MMM d, yyyy');

  const rewardColor = getRewardColor(reward.reward_type, colors);
  const icon = getRewardIcon(reward.reward_type);

  const getTitle = (): string => {
    switch (reward.reward_type) {
      case 'points':
        return reward.description;
      case 'coupon':
        return reward.coupon.title;
      case 'badge':
        return reward.badge.name;
      case 'prize':
        return reward.prize.name;
      default:
        return 'Reward';
    }
  };

  const getEventName = (): string | null => {
    if ('event' in reward && reward.event) {
      return reward.event.name;
    }
    return null;
  };

  const getPlace = (): number | null => {
    if (reward.reward_type === 'coupon' || reward.reward_type === 'prize') {
      return reward.place;
    }
    return null;
  };

  const renderRewardDetails = () => {
    switch (reward.reward_type) {
      case 'points':
        return (
          <View style={styles.detailsContainer}>
            <View style={[styles.pointsBadge, { backgroundColor: `${rewardColor}15` }]}>
              <Text style={[styles.pointsText, { color: rewardColor }]}>
                {reward.points > 0 ? '+' : ''}{reward.points} {t('rewards.points')}
              </Text>
            </View>
            {reward.type && (
              <Text style={[styles.typeText, { color: colors.textMuted }]}>
                {reward.type}
              </Text>
            )}
          </View>
        );

      case 'coupon':
        const isExpired = new Date(reward.coupon.expires_at) < new Date();
        const isCancelled = reward.status === 'cancelled';
        const isActive = reward.coupon.is_active && !isExpired && !isCancelled;

        return (
          <View style={styles.detailsContainer}>
            <View style={[
              styles.couponBadge,
              { backgroundColor: `${rewardColor}15` },
              !isActive && { opacity: 0.5 }
            ]}>
              <Text style={[styles.couponDiscount, { color: rewardColor }]}>
                {reward.coupon.discount_type === 'percentage'
                  ? `${reward.coupon.discount_value}% ${t('rewards.off')}`
                  : `${reward.coupon.discount_value} ${reward.coupon.currency} ${t('rewards.off')}`
                }
              </Text>
            </View>
            <Text style={[styles.couponDescription, { color: colors.textSecondary }]}>
              {reward.coupon.description}
            </Text>
            <Text style={[styles.couponCode, { color: colors.textMuted }]}>
              {t('rewards.code')}: {reward.coupon.code}
            </Text>
            <View style={styles.couponFooter}>
              <Text style={[styles.expiryText, { color: isExpired ? colors.error : colors.textMuted }]}>
                {t('rewards.expiresAt')}: {format(new Date(reward.coupon.expires_at), 'MMM d, yyyy')}
              </Text>
              {isCancelled && (
                <Text style={[styles.statusBadge, { color: colors.error }]}>
                  {t('rewards.cancelled')}
                </Text>
              )}
              {reward.status === 'sent' && (
                <Text style={[styles.statusBadge, { color: colors.success }]}>
                  {t('rewards.sent')}
                </Text>
              )}
            </View>
          </View>
        );

      case 'prize':
        return (
          <View style={styles.detailsContainer}>
            <View style={[styles.prizeBadge, { backgroundColor: `${rewardColor}15` }]}>
              <Text style={[styles.prizeValue, { color: rewardColor }]}>
                {reward.prize.value} {reward.prize.currency}
              </Text>
            </View>
            <Text style={[styles.prizeDescription, { color: colors.textSecondary }]}>
              {reward.prize.description}
            </Text>
            {reward.status === 'cancelled' && (
              <Text style={[styles.statusBadge, { color: colors.error }]}>
                {t('rewards.cancelled')}
              </Text>
            )}
            {reward.status === 'sent' && (
              <Text style={[styles.statusBadge, { color: colors.success }]}>
                {t('rewards.sent')}
              </Text>
            )}
          </View>
        );

      case 'badge':
        const rarityColor = getBadgeRarityColor(reward.badge.rarity, colors);

        return (
          <View style={styles.detailsContainer}>
            <View style={[styles.badgeContainer, { borderColor: rarityColor }]}>
              <Text style={[styles.badgeName, { color: rarityColor }]}>
                {reward.badge.name}
              </Text>
              <Text style={[styles.rarityText, { color: rarityColor }]}>
                {t(`rewards.rarity.${reward.badge.rarity}`)}
              </Text>
            </View>
            <Text style={[styles.badgeDescription, { color: colors.textSecondary }]}>
              {reward.badge.description}
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  const place = getPlace();
  const eventName = getEventName();
  const title = getTitle();
  const isNew = reward.reward_type === 'badge' && reward.is_new;

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${rewardColor}15` }]}>
            <Ionicons name={icon} size={24} color={rewardColor} />
          </View>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
                {title}
              </Text>
              {isNew && (
                <View style={[styles.newBadge, { backgroundColor: colors.error }]}>
                  <Text style={styles.newText}>{t('rewards.new')}</Text>
                </View>
              )}
            </View>
            {eventName && (
              <Text style={[styles.eventName, { color: colors.textSecondary }]}>
                {eventName}
              </Text>
            )}
            {place && place <= 3 && (
              <View style={styles.positionRow}>
                <Ionicons
                  name="trophy"
                  size={14}
                  color={place === 1 ? colors.warning : place === 2 ? colors.textMuted : '#CD7F32'}
                />
                <Text style={[styles.positionText, { color: colors.textSecondary }]}>
                  {t(`rewards.position.${place}`)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {renderRewardDetails()}

        <View style={styles.footer}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.date, { color: colors.textMuted }]}>
              {formattedDate}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    flex: 1,
  },
  newBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  newText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  eventName: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  positionText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  detailsContainer: {
    marginBottom: spacing.md,
  },
  // Points
  pointsBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
  },
  pointsText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  typeText: {
    fontSize: fontSize.xs,
    textTransform: 'capitalize',
  },
  // Coupon
  couponBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  couponDiscount: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  couponDescription: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  couponCode: {
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
  couponFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expiryText: {
    fontSize: fontSize.xs,
  },
  statusBadge: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // Prize
  prizeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  prizeValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  prizeDescription: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  // Badge
  badgeContainer: {
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badgeName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  rarityText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  badgeDescription: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  date: {
    fontSize: fontSize.sm,
  },
});
