/**
 * Background API Client
 *
 * Standalone API client for background tasks that cannot use React hooks or context.
 * Used by the background location tracking task to sync GPS points to the server.
 *
 * Key differences from main API service:
 * - Works in background task context (separate JS environment)
 * - Cannot use React hooks or React context
 * - Reads the auth token directly from SecureStore (iOS Keychain / Android Keystore),
 *   with AsyncStorage fallbacks for emulators and legacy installs
 * - Simpler error handling (no UI callbacks)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

// Must match secureStorage.ts TOKEN_KEY and its '@secure_' AsyncStorage fallback prefix.
const SECURE_TOKEN_KEY = 'racefy_auth_token';
const SECURE_TOKEN_FALLBACK_KEY = '@secure_racefy_auth_token';
const LEGACY_TOKEN_KEY = '@racefy_token';

/**
 * Get auth token from storage.
 * Order: SecureStore (Keychain/Keystore) → AsyncStorage fallback → legacy AsyncStorage.
 *
 * On iOS the foreground app stores the token in Keychain via expo-secure-store,
 * so background sync MUST check SecureStore first — otherwise it gets stuck
 * logging "No auth token" forever (see logs from user 19, May 2026).
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    if (await SecureStore.isAvailableAsync()) {
      const secureToken = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
      if (secureToken) {
        return secureToken;
      }
    }

    // SecureStore unavailable (emulator) — check the AsyncStorage fallback.
    const fallbackToken = await AsyncStorage.getItem(SECURE_TOKEN_FALLBACK_KEY);
    if (fallbackToken) {
      return fallbackToken;
    }

    // Legacy AsyncStorage key, kept for backward compatibility with pre-SecureStore installs.
    const legacyToken = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacyToken) {
      return legacyToken;
    }

    return null;
  } catch (error) {
    logger.error('api', 'Failed to retrieve auth token', { error });
    return null;
  }
}

// NOTE: syncPointsToServer was removed — the SQLite-backed uploader
// (services/pointsUploader.ts) is the single upload path for both contexts.
