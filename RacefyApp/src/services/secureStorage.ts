import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

/**
 * Secure storage service for sensitive data like authentication tokens.
 * Uses expo-secure-store for encrypted storage on iOS (Keychain) and Android (Keystore).
 * Falls back to AsyncStorage if SecureStore is unavailable.
 */

const TOKEN_KEY = 'racefy_auth_token';
const IMPERSONATION_TOKEN_KEY = 'racefy_impersonation_token';
const ADMIN_TOKEN_KEY = 'racefy_admin_token';

// Legacy AsyncStorage keys (for migration)
const LEGACY_TOKEN_KEY = '@racefy_token';
const LEGACY_IMPERSONATION_TOKEN_KEY = '@racefy_impersonation_token';
const LEGACY_ADMIN_TOKEN_KEY = '@racefy_original_admin_token';

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
  try {
    const isAvailable = await isSecureStoreAvailable();

    if (isAvailable) {
      await SecureStore.setItemAsync(key, value);
      logger.debug('auth', `Securely stored: ${key}`);
      return true;
    } else {
      // Fallback to AsyncStorage (less secure but functional for dev)
      await AsyncStorage.setItem(`@secure_${key}`, value);
      logger.warn('auth', `SecureStore unavailable, fell back to AsyncStorage for: ${key}`);
      return true;
    }
  } catch (error) {
    logger.error('auth', `Failed to store securely: ${key}`, { error });
    // Try AsyncStorage as last resort
    try {
      await AsyncStorage.setItem(`@secure_${key}`, value);
      logger.warn('auth', `Fell back to AsyncStorage for: ${key}`);
      return true;
    } catch (fallbackError) {
      logger.error('auth', `Fallback storage also failed: ${key}`, { error: fallbackError });
      return false;
    }
  }
}

/**
 * Retrieve a value from secure storage
 */
async function getSecure(key: string): Promise<string | null> {
  try {
    const isAvailable = await isSecureStoreAvailable();

    if (isAvailable) {
      const value = await SecureStore.getItemAsync(key);
      if (value) {
        return value;
      }
    }

    // Check fallback AsyncStorage
    const fallbackValue = await AsyncStorage.getItem(`@secure_${key}`);
    return fallbackValue;
  } catch (error) {
    logger.error('auth', `Failed to retrieve secure value: ${key}`, { error });
    // Try fallback
    try {
      return await AsyncStorage.getItem(`@secure_${key}`);
    } catch {
      return null;
    }
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
    await AsyncStorage.removeItem(`@secure_${key}`);
    logger.debug('auth', `Removed secure value: ${key}`);
    return true;
  } catch (error) {
    logger.error('auth', `Failed to remove secure value: ${key}`, { error });
    return false;
  }
}

/**
 * Migrate tokens from legacy AsyncStorage to secure storage
 */
async function migrateLegacyTokens(): Promise<void> {
  try {
    // Migrate main token
    const legacyToken = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacyToken) {
      await setSecure(TOKEN_KEY, legacyToken);
      await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
      logger.info('auth', 'Migrated auth token to secure storage');
    }

    // Migrate impersonation token
    const legacyImpersonationToken = await AsyncStorage.getItem(LEGACY_IMPERSONATION_TOKEN_KEY);
    if (legacyImpersonationToken) {
      await setSecure(IMPERSONATION_TOKEN_KEY, legacyImpersonationToken);
      await AsyncStorage.removeItem(LEGACY_IMPERSONATION_TOKEN_KEY);
      logger.info('auth', 'Migrated impersonation token to secure storage');
    }

    // Migrate admin token
    const legacyAdminToken = await AsyncStorage.getItem(LEGACY_ADMIN_TOKEN_KEY);
    if (legacyAdminToken) {
      await setSecure(ADMIN_TOKEN_KEY, legacyAdminToken);
      await AsyncStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
      logger.info('auth', 'Migrated admin token to secure storage');
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
