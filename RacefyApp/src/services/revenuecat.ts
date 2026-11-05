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

/**
 * The key the SDK may be configured with, or `null` when purchases must stay off.
 *
 * A `test_` key runs RevenueCat's Test Store: purchases complete without anyone
 * being charged. In a build that talks to the production API that would hand
 * out paid plans for free, so there the key has to be the store's own
 * (`appl_…` on iOS, `goog_…` on Android) — any other value, not only our own
 * test key, switches purchases off.
 *
 *  - development: whatever is configured, else the bundled test key;
 *  - release for the staging API: a store key or a `test_` key (the staging
 *    backend grants nothing of value);
 *  - release for production: a store key for this platform, nothing else.
 */
export function resolveRevenueCatKey(input: {
  platform: string;
  configuredKey: string;
  appEnv: string;
  isDev: boolean;
}): string | null {
  const key = input.configuredKey.trim();
  if (input.isDev) return key || REVENUECAT_TEST_KEY;

  const storePrefix =
    input.platform === 'ios' ? 'appl_' : input.platform === 'android' ? 'goog_' : null;
  if (storePrefix && key.startsWith(storePrefix)) return key;
  if (input.appEnv === 'staging' && key.startsWith('test_')) return key;
  return null;
}

const REVENUECAT_API_KEY = resolveRevenueCatKey({
  platform: Platform.OS,
  configuredKey: REVENUECAT_PROD_KEY,
  appEnv: APP_ENV,
  isDev: __DEV__,
});

let isConfigured = false;

/**
 * Configure RevenueCat SDK. Call once at app startup.
 */
export async function configureRevenueCat(): Promise<void> {
  if (isConfigured || !Purchases) return;

  if (!REVENUECAT_API_KEY) {
    logger.info('general', 'RevenueCat skipped — no usable API key for this build', {
      env: APP_ENV,
    });
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
 * Make sure the SDK is acting for `userId` before money moves.
 *
 * `revenueCatLogIn` runs in the background after sign-in and its failure is only
 * logged, so the SDK can still be on an anonymous id — or on another account's —
 * when the paywall opens. A purchase made then is charged to the store account
 * and credited to the wrong RevenueCat customer. This checks the id, signs in
 * once more if it is off, and answers `false` when it still does not match.
 *
 * `true` also when the SDK is not there (Expo Go) or was not configured: then
 * nothing can be bought at all.
 */
export async function ensureRevenueCatIdentity(userId: number): Promise<boolean> {
  if (!Purchases || !isConfigured) return true;
  const expected = userId.toString();
  try {
    if ((await Purchases.getAppUserID()) === expected) return true;
    await Purchases.logIn(expected);
    return (await Purchases.getAppUserID()) === expected;
  } catch (error) {
    logger.warn('general', 'Could not confirm the RevenueCat identity', { error, userId });
    return false;
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
 * Purchase a package for `userId`. Returns updated customer info on success.
 * Refuses when the SDK is not acting for that user (see ensureRevenueCatIdentity).
 */
export async function purchasePackage(
  pkg: any,
  userId: number,
): Promise<{ customerInfo: any; success: boolean }> {
  if (!Purchases) return { customerInfo: null, success: false };
  if (!(await ensureRevenueCatIdentity(userId))) {
    logger.error('general', 'Purchase refused — RevenueCat is not on the signed-in account');
    return { customerInfo: null, success: false };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    logger.info('general', 'Purchase completed', {
      productId: pkg.product.identifier,
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
    });
    return { customerInfo, success: true };
  } catch (error) {
    if ((error as { userCancelled?: boolean } | null)?.userCancelled) {
      logger.info('general', 'Purchase cancelled by user');
    } else {
      logger.error('general', 'Purchase failed', { error });
    }
    return { customerInfo: null, success: false };
  }
}

/**
 * Restore previous purchases onto `userId`. Refuses when the SDK is not acting
 * for that user — a restore moves the store account's purchases to whoever the
 * SDK is signed in as.
 */
export async function restorePurchases(userId: number): Promise<any | null> {
  if (!Purchases) return null;
  if (!(await ensureRevenueCatIdentity(userId))) {
    logger.error('general', 'Restore refused — RevenueCat is not on the signed-in account');
    return null;
  }
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
