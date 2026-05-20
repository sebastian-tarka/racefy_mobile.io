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
import {API_BASE_URL} from '../config/api';
import {appendXdebugTrigger} from './api';
import {logger} from './logger';
import {getCurrentLanguage} from '../i18n';
import type {BufferedLocation} from './backgroundLocation';

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
async function getAuthToken(): Promise<string | null> {
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

/**
 * Get API base URL from config
 */
function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * Sync GPS points to server
 *
 * @param activityId - Activity ID to sync points to
 * @param points - GPS points to upload
 * @returns Result object with success status and optional error
 */
export async function syncPointsToServer(
  activityId: number,
  points: BufferedLocation[]
): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();

  try {
    // Get auth token
    const token = await getAuthToken();
    if (!token) {
      logger.error('api', 'Background sync: No auth token available');
      return { success: false, error: 'No auth token' };
    }

    // Build endpoint
    const endpoint = `/activities/${activityId}/points`;
    const url = appendXdebugTrigger(`${getApiBaseUrl()}${endpoint}`);

    // Convert BufferedLocation to GpsPoint format
    const gpsPoints = points.map(point => ({
      lat: point.lat,
      lng: point.lng,
      ele: point.ele,
      time: point.time,
      speed: point.speed,
    }));

    // Build request body
    const body = JSON.stringify({ points: gpsPoints });

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    logger.gps(`Background sync: Sending ${points.length} points to ${endpoint}`);

    // Make request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Accept-Language': getCurrentLanguage(),
        'Authorization': `Bearer ${token}`,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;

    // Parse response
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.message || `HTTP ${response.status}`;
      logger.error('api', `Background sync failed: ${errorMsg}`, {
        status: response.status,
        duration,
        pointCount: points.length,
      });

      // Handle 401 specifically (token expired)
      if (response.status === 401) {
        return { success: false, error: 'Unauthorized (token expired)' };
      }

      return { success: false, error: errorMsg };
    }

    logger.gps(`Background sync: SUCCESS (${points.length} points, ${duration}ms)`);
    return { success: true };

  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Check if it's a timeout
    if (error.name === 'AbortError') {
      logger.error('api', 'Background sync: Request timeout (30s)', {
        duration,
        pointCount: points.length,
      });
      return { success: false, error: 'Request timeout' };
    }

    // Network error or other exception
    const errorMsg = error.message || 'Network error';
    logger.error('api', `Background sync: Exception - ${errorMsg}`, {
      duration,
      pointCount: points.length,
      error,
    });

    return { success: false, error: errorMsg };
  }
}
