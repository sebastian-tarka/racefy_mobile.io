import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
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

// Hardcoded feature list for comparison display (fallback when RevenueCat paywall unavailable)
const FEATURE_ROWS = [
  { key: 'events_monthly', icon: 'calendar-outline', free: '2/mo', plus: '10/mo', pro: 'Unlimited' },
  { key: 'ai_posts_monthly', icon: 'sparkles-outline', free: '-', plus: '20/mo', pro: 'Unlimited' },
  { key: 'ai_post_on_finish', icon: 'flash-outline', free: false, plus: true, pro: true },
  { key: 'event_prizes', icon: 'trophy-outline', free: false, plus: true, pro: true },
  { key: 'event_ai_commentary', icon: 'chatbubbles-outline', free: false, plus: true, pro: true },
  { key: 'training_summaries', icon: 'fitness-outline', free: false, plus: true, pro: true },
  { key: 'advanced_stats', icon: 'stats-chart-outline', free: false, plus: true, pro: true },
  { key: 'gpx_export', icon: 'download-outline', free: false, plus: true, pro: true },
  { key: 'share_link_permanent', icon: 'link-outline', free: false, plus: true, pro: true },
  { key: 'privacy_zones', icon: 'shield-outline', free: '1', plus: '5', pro: '10' },
  { key: 'training_programs', icon: 'barbell-outline', free: '1', plus: '3', pro: 'Unlimited' },
  { key: 'active_training_programs', icon: 'layers-outline', free: '1', plus: '2', pro: 'Unlimited' },
  { key: 'exclusive_badges', icon: 'ribbon-outline', free: false, plus: false, pro: true },
  { key: 'points_multiplier', icon: 'trending-up-outline', free: '1x', plus: '1.25x', pro: '1.5x' },
];

export function PaywallScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Paywall'>>();
  const { tier, isTrial, remainingDays } = useSubscription();
  const { refreshUser } = useAuth();

  const [packages, setPackages] = useState<any[]>([]);
  const [apiPlans, setApiPlans] = useState<Record<string, SubscriptionPlan>>({});
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const highlightFeature = route.params?.feature;

  useEffect(() => {
    const load = async () => {
      try {
        // Load RevenueCat offerings and API plans in parallel
        const [offering, plansResponse] = await Promise.all([
          getOfferings().catch(() => null),
          api.getSubscriptionPlans().catch(() => null),
        ]);
        if (offering?.availablePackages) {
          setPackages(offering.availablePackages);
        }
        if (plansResponse?.plans) {
          const byTier: Record<string, SubscriptionPlan> = {};
          for (const plan of plansResponse.plans) {
            byTier[plan.tier] = plan;
          }
          setApiPlans(byTier);
        }
      } catch (err) {
        logger.error('general', 'Failed to load offerings', { error: err });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  // Present RevenueCat's native paywall (only works in native builds)
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

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
      ) : (
        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
      );
    }
    return <Text style={[styles.featureValue, { color: colors.textPrimary }]}>{value}</Text>;
  };

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

        {/* RevenueCat native paywall button (only in native builds) */}
        {nativePaywallAvailable && packages.length > 0 && (
          <TouchableOpacity
            style={[styles.nativePaywallButton, { backgroundColor: colors.primary }]}
            onPress={handlePresentPaywall}
            disabled={purchasing}
          >
            <Ionicons name="diamond" size={22} color="#fff" />
            <Text style={styles.nativePaywallButtonText}>
              {t('subscription.viewPlans')}
            </Text>
          </TouchableOpacity>
        )}

        {/* RevenueCat packages - manual purchase UI */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.xl }} />
        ) : packages.length > 0 ? (
          <View style={styles.packagesSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('subscription.availablePlans')}
            </Text>
            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.identifier}
                style={[styles.packageCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => handlePurchase(pkg)}
                disabled={purchasing}
                activeOpacity={0.7}
              >
                <View style={styles.packageInfo}>
                  <Text style={[styles.packageTitle, { color: colors.textPrimary }]}>
                    {pkg.product.title}
                  </Text>
                  <Text style={[styles.packageDesc, { color: colors.textSecondary }]}>
                    {pkg.product.description}
                  </Text>
                </View>
                <View style={styles.packagePrice}>
                  <Text style={[styles.priceText, { color: colors.primary }]}>
                    {pkg.product.priceString}
                  </Text>
                  <Text style={[styles.periodText, { color: colors.textMuted }]}>
                    /{pkg.packageType === 'ANNUAL' ? t('subscription.year') : t('subscription.month')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Feature comparison table */}
        <View style={styles.comparisonSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('subscription.compareFeatures')}
          </Text>

          {/* Plan header row */}
          <View style={styles.planHeaderRow}>
            <View style={styles.featureLabelCol} />
            {['free', 'plus', 'pro'].map((planTier) => {
              const plan = apiPlans[planTier];
              return (
                <View key={planTier} style={styles.planCol}>
                  <Text style={[
                    styles.planName,
                    { color: planTier === tier ? colors.primary : colors.textPrimary },
                  ]}>
                    {planTier.charAt(0).toUpperCase() + planTier.slice(1)}
                  </Text>
                  {plan && plan.price_monthly != null && plan.price_monthly > 0 && (
                    <Text style={[styles.planPrice, { color: colors.textSecondary }]}>
                      {formatPrice(plan.price_monthly, plan.currency)}
                      <Text style={styles.planPricePeriod}>/{t('subscription.month')}</Text>
                    </Text>
                  )}
                  {plan && plan.price_monthly === 0 && (
                    <Text style={[styles.planPrice, { color: colors.textSecondary }]}>
                      {t('subscription.free')}
                    </Text>
                  )}
                  {planTier === tier && (
                    <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.currentBadgeText}>{t('subscription.current')}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Feature rows */}
          {FEATURE_ROWS.map((row) => (
            <View
              key={row.key}
              style={[
                styles.featureRow,
                { borderBottomColor: colors.border },
                highlightFeature === row.key && { backgroundColor: colors.primary + '08' },
              ]}
            >
              <View style={styles.featureLabelCol}>
                <Ionicons name={row.icon as any} size={18} color={colors.textSecondary} />
                <Text style={[styles.featureLabel, { color: colors.textPrimary }]}>
                  {t(`subscription.features.${row.key}`)}
                </Text>
              </View>
              <View style={styles.planCol}>{renderFeatureValue(row.free)}</View>
              <View style={styles.planCol}>{renderFeatureValue(row.plus)}</View>
              <View style={styles.planCol}>{renderFeatureValue(row.pro)}</View>
            </View>
          ))}
        </View>

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
    paddingBottom: spacing.xxl * 3,
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
  nativePaywallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  nativePaywallButtonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  packagesSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  packageInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  packageTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  packageDesc: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  packagePrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  periodText: {
    fontSize: fontSize.xs,
  },
  comparisonSection: {
    marginTop: spacing.md,
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  featureLabelCol: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planCol: {
    flex: 1,
    alignItems: 'center',
  },
  planName: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  planPrice: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  planPricePeriod: {
    fontWeight: '400',
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  featureLabel: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  featureValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  restoreLink: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  restoreLinkText: {
    fontSize: fontSize.sm,
  },
  purchasingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
