import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
// Lazy-loaded — native module not available in Expo Go
let RevenueCatUI: any = null;
let PAYWALL_RESULT: any = {};
try {
  const ui = require('react-native-purchases-ui');
  RevenueCatUI = ui.default;
  PAYWALL_RESULT = ui.PAYWALL_RESULT ?? {};
} catch {
  // native module not linked (Expo Go / dev client without rebuild)
}
import { ScreenContainer, ScreenHeader } from '../components';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '../services/revenuecat';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { formatPrice } from '../utils/formatters';
import { spacing, fontSize, borderRadius } from '../theme';
import type { SubscriptionPlan } from '../types/api';
import type { RootStackParamList } from '../navigation/types';

// Feature icon mapping (keys match API response from /subscription/features)
const FEATURE_ICONS: Record<string, string> = {
  events_monthly: 'calendar-outline',
  ai_posts_monthly: 'sparkles-outline',
  ai_post_on_finish: 'flash-outline',
  event_prizes: 'trophy-outline',
  event_ai_commentary: 'chatbubbles-outline',
  training_summaries: 'fitness-outline',
  advanced_stats: 'stats-chart-outline',
  gpx_export: 'download-outline',
  share_link_permanent: 'link-outline',
  privacy_zones: 'shield-outline',
  training_programs: 'barbell-outline',
  active_training_programs: 'layers-outline',
  exclusive_badges: 'ribbon-outline',
  points_multiplier: 'trending-up-outline',
  teams_max: 'people-outline',
  team_members_max: 'person-add-outline',
  coaching_hints_bulk: 'megaphone-outline',
  audio_coach_ai: 'headset-outline',
  insights_advanced: 'analytics-outline',
  ad_free: 'eye-off-outline',
};

// Order for feature comparison table
const FEATURE_ORDER: string[] = [
  'events_monthly',
  'ai_posts_monthly',
  'ai_post_on_finish',
  'training_programs',
  'active_training_programs',
  'training_summaries',
  'privacy_zones',
  'advanced_stats',
  'insights_advanced',
  'audio_coach_ai',
  'gpx_export',
  'share_link_permanent',
  'event_prizes',
  'event_ai_commentary',
  'exclusive_badges',
  'coaching_hints_bulk',
  'teams_max',
  'team_members_max',
  'points_multiplier',
];

// Key features shown on plan cards (bullet points)
const KEY_FEATURES_BY_TIER: Record<string, string[]> = {
  free: ['events_monthly', 'training_programs', 'teams_max', 'privacy_zones'],
  plus: ['ai_posts_monthly', 'events_monthly', 'training_summaries', 'advanced_stats', 'gpx_export', 'audio_coach_ai'],
  pro: ['events_monthly', 'ai_posts_monthly', 'exclusive_badges', 'points_multiplier', 'coaching_hints_bulk', 'teams_max'],
};

// Features data from /subscription/features endpoint
type FeaturesPerTier = Record<string, Record<string, boolean | number>>;

export function PaywallScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Paywall'>>();
  const { tier, isTrial, remainingDays } = useSubscription();
  const { refreshUser } = useAuth();

  const [packages, setPackages] = useState<any[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [featuresPerTier, setFeaturesPerTier] = useState<FeaturesPerTier>({});
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const highlightFeature = route.params?.feature;

  useEffect(() => {
    const load = async () => {
      try {
        const [offering, plansData, featuresData] = await Promise.all([
          getOfferings().catch(() => null),
          api.getSubscriptionPlans().catch(() => null),
          api.getSubscriptionFeatures().catch(() => null),
        ]);
        if (offering?.availablePackages) {
          setPackages(offering.availablePackages);
        }
        if (plansData?.plans) {
          setPlans(plansData.plans);
        }
        if (featuresData?.features) {
          setFeaturesPerTier(featuresData.features);
        }
      } catch (err) {
        logger.error('general', 'Failed to load offerings', { error: err });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const findPackageForPlan = useCallback((planTier: string, cycle: 'monthly' | 'yearly') => {
    return packages.find(pkg => {
      const id = (pkg.identifier || '').toLowerCase();
      const matchesTier = id.includes(planTier);
      const matchesCycle = cycle === 'monthly'
        ? (id.includes('month') || pkg.packageType === 'MONTHLY')
        : (id.includes('annual') || id.includes('year') || pkg.packageType === 'ANNUAL');
      return matchesTier && matchesCycle;
    });
  }, [packages]);

  const handlePurchase = useCallback(async (pkg: any) => {
    setPurchasing(true);
    try {
      const { success } = await purchasePackage(pkg);
      if (success) {
        await refreshUser();
        Alert.alert(
          t('subscription.purchaseSuccess'),
          t('subscription.purchaseSuccessDesc'),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
      }
    } catch {
      Alert.alert(t('common.error'), t('subscription.purchaseFailed'));
    } finally {
      setPurchasing(false);
    }
  }, [refreshUser, navigation, t]);

  const handleSelectPlan = useCallback((plan: SubscriptionPlan) => {
    if (plan.tier === 'free' || plan.tier === tier) return;
    const pkg = findPackageForPlan(plan.tier, billingCycle);
    if (pkg) {
      handlePurchase(pkg);
    } else {
      logger.warn('general', 'No RevenueCat package found for plan', { tier: plan.tier, cycle: billingCycle });
      Alert.alert(t('common.error'), t('subscription.purchaseFailed'));
    }
  }, [tier, billingCycle, findPackageForPlan, handlePurchase, t]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const customerInfo = await restorePurchases();
      if (customerInfo) {
        await refreshUser();
        const hasActive = Object.keys(customerInfo.entitlements.active).length > 0;
        if (hasActive) {
          Alert.alert(
            t('subscription.restoreSuccess'),
            t('subscription.restoreSuccessDesc'),
            [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert(t('subscription.restoreEmpty'), t('subscription.restoreEmptyDesc'));
        }
      }
    } catch {
      Alert.alert(t('common.error'), t('subscription.restoreFailed'));
    } finally {
      setRestoring(false);
    }
  }, [refreshUser, navigation, t]);

  const nativePaywallAvailable = !!RevenueCatUI;

  const handlePresentPaywall = useCallback(async () => {
    if (!RevenueCatUI) return;
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: 'Racefy Plus',
      });
      logger.info('general', 'RevenueCat paywall result', { result });
      await refreshUser();
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        navigation.goBack();
      }
    } catch (error) {
      logger.error('general', 'RevenueCat paywall failed, using fallback', { error });
    }
  }, [refreshUser, navigation]);

  const renderFeatureValue = (value: boolean | number, featureKey: string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
      ) : (
        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
      );
    }
    if (typeof value === 'number') {
      if (value === -1) {
        return <Text style={[styles.featureValueText, { color: colors.primary }]}>{t('subscription.unlimited')}</Text>;
      }
      if (value === 0) {
        return <Ionicons name="close-circle" size={18} color={colors.textMuted} />;
      }
      const displayValue = featureKey === 'points_multiplier' ? `${value}x` : String(value);
      return <Text style={[styles.featureValueText, { color: colors.primary }]}>{displayValue}</Text>;
    }
    return null;
  };

  const renderKeyFeatureValue = (value: boolean | number, featureKey: string): string => {
    if (typeof value === 'boolean') return '';
    if (typeof value === 'number') {
      if (value === -1) return t('subscription.unlimited');
      if (value === 0) return '';
      if (featureKey === 'points_multiplier') return `${value}x`;
      return String(value);
    }
    return '';
  };

  const getPlanPrice = (plan: SubscriptionPlan): string => {
    if (plan.tier === 'free') return t('subscription.free');
    const rawPrice = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
    const price = typeof rawPrice === 'string' ? parseFloat(rawPrice) : rawPrice;
    if (price == null || price === 0) return t('subscription.free');
    return formatPrice(price, plan.currency);
  };

  const getPlanPeriod = (): string => {
    return billingCycle === 'monthly' ? t('subscription.perMonth') : t('subscription.perYear');
  };

  // Sort plans: free, plus, pro
  const tierOrder = { free: 0, plus: 1, pro: 2 };
  const sortedPlans = [...plans].sort((a, b) => (tierOrder[a.tier] ?? 0) - (tierOrder[b.tier] ?? 0));

  return (
    <ScreenContainer>
      <ScreenHeader title={t('subscription.choosePlan')} showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Trial banner */}
        {isTrial && remainingDays !== null && (
          <View style={[styles.trialCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}>
            <Ionicons name="diamond-outline" size={20} color={colors.primary} />
            <Text style={[styles.trialText, { color: colors.primary }]}>
              {t('subscription.trialActive', { days: remainingDays })}
            </Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.xl }} />
        ) : (
          <>
            {/* Billing cycle toggle */}
            {sortedPlans.length > 0 && (
              <View style={[styles.toggleContainer, { backgroundColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    billingCycle === 'monthly' && { backgroundColor: colors.cardBackground },
                  ]}
                  onPress={() => setBillingCycle('monthly')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.toggleText,
                    { color: billingCycle === 'monthly' ? colors.textPrimary : colors.textSecondary },
                    billingCycle === 'monthly' && styles.toggleTextActive,
                  ]}>
                    {t('subscription.monthly')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    billingCycle === 'yearly' && { backgroundColor: colors.cardBackground },
                  ]}
                  onPress={() => setBillingCycle('yearly')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.toggleText,
                    { color: billingCycle === 'yearly' ? colors.textPrimary : colors.textSecondary },
                    billingCycle === 'yearly' && styles.toggleTextActive,
                  ]}>
                    {t('subscription.yearlyDiscount')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Plan cards */}
            {sortedPlans.map((plan) => {
              const isCurrentPlan = plan.tier === tier;
              const isPopular = plan.is_popular || plan.tier === 'plus';
              const keyFeatures = KEY_FEATURES_BY_TIER[plan.tier] || [];

              return (
                <View
                  key={plan.id}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: isPopular ? colors.primary : colors.border,
                      borderWidth: isPopular ? 2 : 1,
                    },
                  ]}
                >
                  {/* Popular badge */}
                  {isPopular && (
                    <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.popularBadgeText}>{t('subscription.mostPopular')}</Text>
                    </View>
                  )}

                  {/* Plan name */}
                  <Text style={[styles.planName, { color: colors.textSecondary }]}>
                    {plan.name}
                  </Text>

                  {/* Price */}
                  <View style={styles.priceRow}>
                    <Text style={[
                      styles.planPrice,
                      { color: isPopular ? colors.primary : colors.textPrimary },
                    ]}>
                      {getPlanPrice(plan)}
                    </Text>
                    {plan.tier !== 'free' && (
                      <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>
                        {' '}{getPlanPeriod()}
                      </Text>
                    )}
                  </View>

                  {/* Key features */}
                  <View style={styles.keyFeatures}>
                    {keyFeatures.map((featureKey) => {
                      const tierFeatures = featuresPerTier[plan.tier] || plan.features || {};
                      const value = tierFeatures[featureKey];
                      if (value === undefined || value === false || value === 0) return null;
                      const valueStr = renderKeyFeatureValue(value, featureKey);
                      return (
                        <View key={featureKey} style={styles.keyFeatureRow}>
                          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                          <Text style={[styles.keyFeatureText, { color: colors.textPrimary }]}>
                            {valueStr ? `${valueStr} ` : ''}{t(`subscription.features.${featureKey}`)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* CTA button */}
                  {isCurrentPlan ? (
                    <View style={[styles.ctaButton, { backgroundColor: colors.border }]}>
                      <Text style={[styles.ctaButtonText, { color: colors.textMuted }]}>
                        {t('subscription.currentPlan')}
                      </Text>
                    </View>
                  ) : plan.tier === 'free' ? (
                    <View style={[styles.ctaButton, { backgroundColor: colors.border }]}>
                      <Text style={[styles.ctaButtonText, { color: colors.textSecondary }]}>
                        {t('subscription.free')}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.ctaButton, {
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderColor: colors.primary,
                      }]}
                      onPress={() => handleSelectPlan(plan)}
                      disabled={purchasing}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.ctaButtonText, { color: colors.primary }]}>
                        {t('subscription.selectPlan')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* RevenueCat native paywall button (secondary) */}
            {nativePaywallAvailable && packages.length > 0 && (
              <TouchableOpacity
                style={[styles.nativePaywallButton, { borderColor: colors.primary }]}
                onPress={handlePresentPaywall}
                disabled={purchasing}
              >
                <Ionicons name="diamond" size={20} color={colors.primary} />
                <Text style={[styles.nativePaywallButtonText, { color: colors.primary }]}>
                  {t('subscription.viewPlans')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Feature comparison table */}
            {(sortedPlans.length > 0 || Object.keys(featuresPerTier).length > 0) && (
              <View style={styles.comparisonSection}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {t('subscription.compareFeatures')}
                </Text>

                {/* Plan header row */}
                <View style={[styles.tableHeaderRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.featureLabelCol} />
                  {['free', 'plus', 'pro'].map((planTier) => (
                    <View key={planTier} style={styles.planCol}>
                      <Text style={[
                        styles.tableHeaderPlan,
                        { color: planTier === tier ? colors.primary : colors.textPrimary },
                      ]}>
                        {planTier === 'free' ? t('subscription.free') : planTier.charAt(0).toUpperCase() + planTier.slice(1)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Feature rows */}
                {FEATURE_ORDER.filter(key => {
                  // Only show features that exist in API data
                  const anyTier = featuresPerTier.free || featuresPerTier.plus || featuresPerTier.pro;
                  return anyTier && key in anyTier;
                }).map((featureKey) => (
                  <View
                    key={featureKey}
                    style={[
                      styles.featureRow,
                      { borderBottomColor: colors.border },
                      highlightFeature === featureKey && { backgroundColor: colors.primary + '08' },
                    ]}
                  >
                    <View style={styles.featureLabelCol}>
                      <Ionicons
                        name={(FEATURE_ICONS[featureKey] || 'ellipse-outline') as any}
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={[styles.featureLabel, { color: colors.textPrimary }]}>
                        {t(`subscription.features.${featureKey}`)}
                      </Text>
                    </View>
                    {['free', 'plus', 'pro'].map((planTier) => {
                      const tierData = featuresPerTier[planTier] || {};
                      const value = tierData[featureKey];
                      return (
                        <View key={planTier} style={styles.planCol}>
                          {value !== undefined ? renderFeatureValue(value, featureKey) : null}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}

            {/* Support footer */}
            <View style={styles.supportFooter}>
              <Text style={[styles.supportText, { color: colors.textMuted }]}>
                {t('subscription.contactSupport')}{' '}
              </Text>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:support@racefy.io')}>
                <Text style={[styles.supportLink, { color: colors.primary }]}>
                  support@racefy.io
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Restore purchases */}
        <TouchableOpacity
          style={styles.restoreLink}
          onPress={handleRestore}
          disabled={restoring}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Text style={[styles.restoreLinkText, { color: colors.textMuted }]}>
              {t('subscription.restorePurchases')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Purchasing overlay */}
      {purchasing && (
        <View style={styles.purchasingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl * 3,
  },
  trialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  trialText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  // Billing toggle
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: 3,
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },
  toggleButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  toggleText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  toggleTextActive: {
    fontWeight: '700',
  },

  // Plan cards
  planCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    position: 'relative',
    overflow: 'visible',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -60 }],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  planName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  planPrice: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
  },
  planPeriod: {
    fontSize: fontSize.sm,
  },
  keyFeatures: {
    marginBottom: spacing.md,
  },
  keyFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 3,
  },
  keyFeatureText: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  ctaButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },

  // Native paywall (secondary)
  nativePaywallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
  },
  nativePaywallButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },

  // Feature comparison
  comparisonSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    marginBottom: spacing.xs,
  },
  tableHeaderLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  tableHeaderPlan: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  featureLabelCol: {
    flex: 2.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planCol: {
    flex: 1,
    alignItems: 'center',
  },
  featureLabel: {
    fontSize: fontSize.xs,
    flex: 1,
  },
  featureValueText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  // Support footer
  supportFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    flexWrap: 'wrap',
  },
  supportText: {
    fontSize: fontSize.sm,
  },
  supportLink: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  // Restore
  restoreLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  restoreLinkText: {
    fontSize: fontSize.sm,
  },

  // Overlay
  purchasingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
