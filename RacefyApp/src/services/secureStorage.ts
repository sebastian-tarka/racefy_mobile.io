import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

/**
 * Secure storage service for sensitive data like authentication tokens.
 * Uses expo-secure-store for encrypted storage on iOS (Keychain) and Android (Keystore).
 *
 * Fallback policy:
 * - AsyncStorage is used ONLY when SecureStore reports itself as unavailable (e.g., some emulators),
 *   for writing and for reading alike.
 * - If SecureStore is available but throws an error, we do NOT fall back — we return false so the
 *   caller can handle the failure. Silently writing tokens to unencrypted storage when the secure
 *   store claims to be available would be a security regression.
 */

const TOKEN_KEY = 'racefy_auth_token';
const IMPERSONATION_TOKEN_KEY = 'racefy_impersonation_token';
const ADMIN_TOKEN_KEY = 'racefy_admin_token';

// Legacy AsyncStorage keys (for migration)
const LEGACY_TOKEN_KEY = '@racefy_token';
const LEGACY_IMPERSONATION_TOKEN_KEY = '@racefy_impersonation_token';
const LEGACY_ADMIN_TOKEN_KEY = '@racefy_original_admin_token';

/** Where a value lives in AsyncStorage when SecureStore does not exist on the device. */
function fallbackKey(key: string): string {
  return `@secure_${key}`;
}

/**
 * Check if SecureStore is available on this device
 */
async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Store a value securely
 */
async function setSecure(key: string, value: string): Promise<boolean> {
  const isAvailable = await isSecureStoreAvailable();

  if (!isAvailable) {
    // SecureStore not available on this device (e.g., emulator) — use AsyncStorage as fallback
    try {
      await AsyncStorage.setItem(fallbackKey(key), value);
      logger.warn('auth', `SecureStore unavailable, fell back to AsyncStorage for: ${key}`);
      return true;
    } catch (error) {
      logger.error('auth', `AsyncStorage fallback write failed: ${key}`, { error });
      return false;
    }
  }

  // SecureStore is available — use it exclusively, never fall back on error
  try {
    await SecureStore.setItemAsync(key, value);
    logger.debug('auth', `Securely stored: ${key}`);
    return true;
  } catch (error) {
    logger.error('auth', `SecureStore write failed: ${key}`, { error });
    return false; // Do not fall back — caller must handle this
  }
}

/**
 * Retrieve a value from secure storage.
 *
 * Where SecureStore works it is the only source. The unencrypted AsyncStorage
 * copy is read solely where SecureStore does not exist — otherwise a value left
 * there (or put there) would be accepted as a session whenever the Keychain /
 * Keystore entry is missing.
 */
async function getSecure(key: string): Promise<string | null> {
  try {
    if (await isSecureStoreAvailable()) {
      return await SecureStore.getItemAsync(key);
    }
    return await AsyncStorage.getItem(fallbackKey(key));
  } catch (error) {
    logger.error('auth', `Failed to retrieve secure value: ${key}`, { error });
    return null;
  }
}

/**
 * Remove a value from secure storage
 */
async function removeSecure(key: string): Promise<boolean> {
  try {
    const isAvailable = await isSecureStoreAvailable();

    if (isAvailable) {
      await SecureStore.deleteItemAsync(key);
    }

    // Also remove fallback if exists
    await AsyncStorage.removeItem(fallbackKey(key));
    logger.debug('auth', `Removed secure value: ${key}`);
    return true;
  } catch (error) {
    logger.error('auth', `Failed to remove secure value: ${key}`, { error });
    return false;
  }
}

/**
 * Move one token from unencrypted AsyncStorage into secure storage.
 *
 * The plain copy is removed only once the secure write has succeeded: deleting
 * it after a failed write would sign the user out for nothing. It then stays
 * for the next start, which tries again.
 */
async function moveToSecure(plainKey: string, key: string, label: string): Promise<void> {
  const value = await AsyncStorage.getItem(plainKey);
  if (!value) return;

  // Never replace a token the secure store already holds with an older plain one.
  const alreadyStored = await SecureStore.getItemAsync(key);
  if (!alreadyStored && !(await setSecure(key, value))) {
    logger.warn('auth', `Could not move the ${label} to secure storage, keeping it for a retry`);
    return;
  }
  await AsyncStorage.removeItem(plainKey);
  logger.info('auth', `Moved the ${label} to secure storage`);
}

/**
 * Move tokens out of unencrypted AsyncStorage: the keys used before secure
 * storage existed, and the `@secure_…` copies written while SecureStore was
 * reported unavailable. Does nothing where SecureStore does not exist — there
 * the AsyncStorage copy is the token.
 */
async function migrateLegacyTokens(): Promise<void> {
  try {
    if (!(await isSecureStoreAvailable())) return;

    const tokens: [legacyKey: string, key: string, label: string][] = [
      [LEGACY_TOKEN_KEY, TOKEN_KEY, 'auth token'],
      [LEGACY_IMPERSONATION_TOKEN_KEY, IMPERSONATION_TOKEN_KEY, 'impersonation token'],
      [LEGACY_ADMIN_TOKEN_KEY, ADMIN_TOKEN_KEY, 'admin token'],
    ];
    for (const [legacyKey, key, label] of tokens) {
      await moveToSecure(legacyKey, key, label);
      await moveToSecure(fallbackKey(key), key, label);
    }
  } catch (error) {
    logger.error('auth', 'Token migration failed', { error });
  }
}

// Public API for token management
export const secureStorage = {
  // Auth token
  async getToken(): Promise<string | null> {
    return getSecure(TOKEN_KEY);
  },
  async setToken(token: string): Promise<boolean> {
    return setSecure(TOKEN_KEY, token);
  },
  async clearToken(): Promise<boolean> {
    return removeSecure(TOKEN_KEY);
  },

  // Impersonation token
  async getImpersonationToken(): Promise<string | null> {
    return getSecure(IMPERSONATION_TOKEN_KEY);
  },
  async setImpersonationToken(token: string): Promise<boolean> {
    return setSecure(IMPERSONATION_TOKEN_KEY, token);
  },
  async clearImpersonationToken(): Promise<boolean> {
    return removeSecure(IMPERSONATION_TOKEN_KEY);
  },

  // Admin token (stored during impersonation)
  async getAdminToken(): Promise<string | null> {
    return getSecure(ADMIN_TOKEN_KEY);
  },
  async setAdminToken(token: string): Promise<boolean> {
    return setSecure(ADMIN_TOKEN_KEY, token);
  },
  async clearAdminToken(): Promise<boolean> {
    return removeSecure(ADMIN_TOKEN_KEY);
  },

  // Clear all tokens
  async clearAllTokens(): Promise<void> {
    await removeSecure(TOKEN_KEY);
    await removeSecure(IMPERSONATION_TOKEN_KEY);
    await removeSecure(ADMIN_TOKEN_KEY);
    logger.info('auth', 'Cleared all secure tokens');
  },

  // Migration helper
  migrateLegacyTokens,

  // Utility
  isAvailable: isSecureStoreAvailable,
};
