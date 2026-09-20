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
import { API_BASE_URL } from '../config/api';
import { getCurrentLanguage } from '../i18n';
import type { Activity, FinishActivityRequest, FinishActivityResponse } from '../types/api';

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

const HEADLESS_TIMEOUT_MS = 30_000;

/**
 * One authenticated JSON request outside React. Deliberately NOT the main `api`
 * client: that one reacts to a 401 by clearing the token and bouncing the UI to
 * the login screen — side effects a background task must never trigger. Errors
 * carry `.status` exactly like the main client's, so finishSync classifies them
 * the same way; no answer at all (offline, timeout) throws without a status.
 */
async function headlessRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getAuthToken();
  if (!token) {
    throw Object.assign(new Error('No auth token'), { status: 401 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEADLESS_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Accept-Language': getCurrentLanguage(),
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw Object.assign(new Error(data?.message || `HTTP ${response.status}`), {
        status: response.status,
        // Same shape as the main client's errors: finishSync reads `.data` to see
        // WHICH activity blocks a start.
        data: data?.data,
      });
    }
    return data as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** `POST /activities/start` — for an activity recorded offline and never created. */
export async function startActivityHeadless(payload: Record<string, unknown>): Promise<Activity> {
  const response = await headlessRequest<{ data: Activity }>('POST', '/activities/start', payload);
  return response.data;
}

export function finishActivityHeadless(
  activityId: number,
  payload: FinishActivityRequest,
): Promise<FinishActivityResponse> {
  return headlessRequest('POST', `/activities/${activityId}/finish`, payload);
}

export async function getActivityHeadless(activityId: number): Promise<Activity> {
  const response = await headlessRequest<{ data: Activity }>('GET', `/activities/${activityId}`);
  return response.data;
}
