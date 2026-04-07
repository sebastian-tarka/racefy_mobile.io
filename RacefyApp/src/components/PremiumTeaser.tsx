import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../hooks/useSubscription';
import { useTheme } from '../hooks/useTheme';
import { upgradePromptEmitter } from '../services/upgradePromptEmitter';
import { spacing, fontSize, borderRadius } from '../theme';
import type { SubscriptionFeatures } from '../types/api';

interface PremiumTeaserProps {
  feature: keyof SubscriptionFeatures;
  children?: React.ReactNode;
  /** Optional custom placeholder shown instead of children when locked */
  placeholder?: React.ReactNode;
  /** Required tier label to display on the badge (auto-detected if omitted) */
  requiredTier?: 'plus' | 'pro';
  /** Style for the outer container */
  style?: any;
}

const MIN_HEIGHT = 120;

/**
 * Wraps content with a lock overlay for non-premium users.
 * If user can use the feature, renders children normally.
 * If not, shows a card with lock icon, feature name, tier badge, and tap hint.
 * Enforces a minimum height so the overlay is always readable.
 */
export function PremiumTeaser({
  feature,
  children,
  placeholder,
  requiredTier,
  style,
}: PremiumTeaserProps) {
  const { canUse, tier } = useSubscription();
  const { colors } = useTheme();
  const { t } = useTranslation();

  if (canUse(feature)) {
    return children ? <>{children}</> : null;
  }

  const badgeTier = requiredTier ?? 'plus';
  const badgeColor = badgeTier === 'pro' ? '#A855F7' : colors.primary;

  const handlePress = () => {
    upgradePromptEmitter.emit('show', { feature, currentTier: tier });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[
        styles.wrapper,
        { borderColor: badgeColor + '25', backgroundColor: colors.cardBackground },
        style,
      ]}
    >
      {/* Dimmed children behind — hidden overflow keeps it from leaking */}
      {(placeholder || children) && (
        <View style={styles.childrenLayer} pointerEvents="none">
          {placeholder ?? children}
        </View>
      )}

      {/* Overlay always fills the card and enforces min height */}
      <View style={[styles.overlay, { backgroundColor: colors.background + 'E6' }]}>
        <View style={[styles.lockCircle, { backgroundColor: badgeColor + '20' }]}>
          <Ionicons name="lock-closed" size={20} color={badgeColor} />
        </View>
        <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={1}>
          {t(`subscription.features.${feature}`)}
        </Text>
        <View style={[styles.badge, { backgroundColor: badgeColor + '15' }]}>
          <Ionicons name="diamond" size={12} color={badgeColor} />
          <Text style={[styles.badgeText, { color: badgeColor }]}>
            {badgeTier.toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.tapHint, { color: colors.textMuted }]}>
          {t('subscription.tapToUpgrade')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    minHeight: MIN_HEIGHT,
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  childrenLayer: {
    opacity: 0.15,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    minHeight: MIN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  lockCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tapHint: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
