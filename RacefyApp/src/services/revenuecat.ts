/**
 * RevenueCat integration service.
 *
 * Handles SDK initialization, user identification, purchases,
 * and entitlement checking.
 *
 * The native module may not be linked in Expo Go — every public
 * function gracefully no-ops when Purchases is unavailable.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { logger } from './logger';

// Lazy-load — native module is missing in Expo Go
let Purchases: any = null;
let LOG_LEVEL: any = {};
try {
  const mod = require('react-native-purchases');
  Purchases = mod.default;
  LOG_LEVEL = mod.LOG_LEVEL;
} catch {
  // react-native-purchases not linked (Expo Go)
}

// Re-export types for consumers (types are always safe to import)
export type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

// Environment detection
const APP_ENV = Constants.expoConfig?.extra?.appEnv || 'production';

// RevenueCat API keys per platform
// Use production keys when available, fall back to test keys
const REVENUECAT_PROD_KEY = Platform.select({
  ios: Constants.expoConfig?.extra?.revenueCatAppleApiKey || '',
  android: Constants.expoConfig?.extra?.revenueCatGoogleApiKey || '',
  default: '',
});

const REVENUECAT_TEST_KEY = 'test_imuKPattskGISWCnJMolGWUNmzI';

const REVENUECAT_API_KEY = REVENUECAT_PROD_KEY || REVENUECAT_TEST_KEY;

// Entitlement identifiers (must match RevenueCat dashboard)
export const ENTITLEMENTS = {
  PLUS: 'Racefy Plus',
  PRO: 'Racefy Pro',
} as const;

let isConfigured = false;

/**
 * Configure RevenueCat SDK. Call once at app startup.
 */
export async function configureRevenueCat(): Promise<void> {
  if (isConfigured || !Purchases) return;

  if (!REVENUECAT_API_KEY || REVENUECAT_API_KEY === REVENUECAT_TEST_KEY && !__DEV__) {
    logger.info('general', 'RevenueCat skipped — no API key configured', { env: APP_ENV });
    return;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
    });

    isConfigured = true;
    logger.info('general', 'RevenueCat configured', { platform: Platform.OS, env: APP_ENV });
  } catch (error) {
    logger.warn('general', 'Failed to configure RevenueCat — purchases disabled', { error });
  }
}

/**
 * Identify user in RevenueCat after login.
 */
export async function revenueCatLogIn(userId: number): Promise<any | null> {
  if (!Purchases) return null;
  try {
    const { customerInfo } = await Purchases.logIn(userId.toString());
    logger.info('auth', 'RevenueCat user identified', {
      userId,
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
    });
    return customerInfo;
  } catch (error) {
    logger.error('auth', 'RevenueCat logIn failed', { error, userId });
    return null;
  }
}

/**
 * Log out from RevenueCat (creates anonymous user).
 */
export async function revenueCatLogOut(): Promise<void> {
  if (!Purchases) return;
  try {
    await Purchases.logOut();
    logger.info('auth', 'RevenueCat user logged out');
  } catch (error) {
    logger.error('auth', 'RevenueCat logOut failed', { error });
  }
}

/**
 * Get current customer info (entitlements, subscriptions).
 */
export async function getCustomerInfo(): Promise<any | null> {
  if (!Purchases) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    logger.error('general', 'Failed to get RevenueCat customer info', { error });
    return null;
  }
}

/**
 * Get available offerings (products/packages).
 */
export async function getOfferings(): Promise<any | null> {
  if (!Purchases) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    logger.error('general', 'Failed to get RevenueCat offerings', { error });
    return null;
  }
}

/**
 * Purchase a package. Returns updated customer info on success.
 */
export async function purchasePackage(
  pkg: any
): Promise<{ customerInfo: any; success: boolean }> {
  if (!Purchases) return { customerInfo: null, success: false };
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    logger.info('general', 'Purchase completed', {
      productId: pkg.product.identifier,
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
    });
    return { customerInfo, success: true };
  } catch (error: any) {
    if (error.userCancelled) {
      logger.info('general', 'Purchase cancelled by user');
    } else {
      logger.error('general', 'Purchase failed', { error });
    }
    return { customerInfo: null, success: false };
  }
}

/**
 * Restore previous purchases.
 */
export async function restorePurchases(): Promise<any | null> {
  if (!Purchases) return null;
  try {
    const customerInfo = await Purchases.restorePurchases();
    logger.info('general', 'Purchases restored', {
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
    });
    return customerInfo;
  } catch (error) {
    logger.error('general', 'Failed to restore purchases', { error });
    return null;
  }
}

/**
 * Check if user has a specific entitlement active.
 */
export function hasEntitlement(
  customerInfo: any,
  entitlement: string
): boolean {
  return entitlement in (customerInfo?.entitlements?.active ?? {});
}

/**
 * Check if user has Plus or Pro entitlement.
 */
export function isPremiumFromCustomerInfo(customerInfo: any): boolean {
  return (
    hasEntitlement(customerInfo, ENTITLEMENTS.PLUS) ||
    hasEntitlement(customerInfo, ENTITLEMENTS.PRO)
  );
}
