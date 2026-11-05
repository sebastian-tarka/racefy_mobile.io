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
 *   from AsyncStorage only where SecureStore does not exist (some emulators)
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

/**
 * Get auth token from storage — the same rule as secureStorage.ts: SecureStore
 * (Keychain / Keystore) where it works, the AsyncStorage copy only where it does
 * not exist. Tokens still under a pre-SecureStore key are moved by
 * `secureStorage.migrateLegacyTokens()` when the app starts.
 *
 * On iOS the foreground app stores the token in Keychain via expo-secure-store,
 * so background sync MUST read SecureStore — otherwise it gets stuck
 * logging "No auth token" forever (see logs from user 19, May 2026).
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    if (await SecureStore.isAvailableAsync()) {
      return await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
    }
    // SecureStore does not exist here (some emulators) — the AsyncStorage copy is the token.
    return await AsyncStorage.getItem(SECURE_TOKEN_FALLBACK_KEY);
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
