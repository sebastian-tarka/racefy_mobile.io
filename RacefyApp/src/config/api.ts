import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// Get config from app.config.ts extra field (loaded from .env)
const extra = Constants.expoConfig?.extra ?? {};
const LOCAL_IP = extra.apiLocalIp || '192.168.1.100';
const LOCAL_PORT = extra.apiLocalPort || '8080';
const PRODUCTION_URL = extra.apiProductionUrl || 'https://api.racefy.app/api';

// Xdebug debugging - only active in development mode
export const XDEBUG_ENABLED = __DEV__ && extra.xdebugEnabled === true;

// API Base URL configuration
const getBaseUrl = (): string => {
  if (__DEV__) {
    // Physical device (Expo Go or dev build) - use local IP from .env
    if (Device.isDevice) {
      return `http://${LOCAL_IP}:${LOCAL_PORT}/api`;
    }
    // Emulator/Simulator
    if (Platform.OS === 'android') {
      // Android Emulator uses 10.0.2.2 to access host machine's localhost
      return `http://10.0.2.2:${LOCAL_PORT}/api`;
    }
    // iOS Simulator can use localhost directly
    return `http://localhost:${LOCAL_PORT}/api`;
  }
  // Production
  return PRODUCTION_URL;
};

export const API_BASE_URL = getBaseUrl();

// Get the base host for storage URLs (without /api)
const getStorageBaseUrl = (): string => {
  if (__DEV__) {
    if (Device.isDevice) {
      return `http://${LOCAL_IP}:${LOCAL_PORT}`;
    }
    if (Platform.OS === 'android') {
      return `http://10.0.2.2:${LOCAL_PORT}`;
    }
    return `http://localhost:${LOCAL_PORT}`;
  }
  // Production - strip /api from the URL
  return PRODUCTION_URL.replace('/api', '');
};

/**
 * Fix storage URLs returned from API
 * Replaces localhost/127.0.0.1 with the correct host for the current platform
 * Also fixes port mismatches when the API returns wrong port
 */
export const fixStorageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  const storageBase = getStorageBaseUrl();
  console.log('[fixStorageUrl] Input:', url);
  console.log('[fixStorageUrl] Storage base:', storageBase);
  console.log('[fixStorageUrl] LOCAL_IP:', LOCAL_IP, 'LOCAL_PORT:', LOCAL_PORT);

  // Handle relative URLs (e.g., /storage/videos/...)
  if (url.startsWith('/')) {
    const result = `${storageBase}${url}`;
    console.log('[fixStorageUrl] Relative URL, result:', result);
    return result;
  }

  // Replace localhost with the correct host
  if (url.includes('localhost:')) {
    const result = url.replace(/http:\/\/localhost:\d+/, storageBase);
    console.log('[fixStorageUrl] localhost replaced, result:', result);
    return result;
  }

  // Replace 127.0.0.1 with the correct host
  if (url.includes('127.0.0.1:')) {
    const result = url.replace(/http:\/\/127\.0\.0\.1:\d+/, storageBase);
    console.log('[fixStorageUrl] 127.0.0.1 replaced, result:', result);
    return result;
  }

  // Replace 10.0.2.2 (Android emulator localhost) when on physical device
  if (url.includes('10.0.2.2:')) {
    const result = url.replace(/http:\/\/10\.0\.2\.2:\d+/, storageBase);
    console.log('[fixStorageUrl] 10.0.2.2 replaced, result:', result);
    return result;
  }

  // Fix port mismatch: API might return URLs with wrong port (e.g., 8000 instead of 8080)
  // Replace any URL with the configured LOCAL_IP but wrong port
  if (__DEV__ && url.includes(LOCAL_IP)) {
    const escapedIp = LOCAL_IP.replace(/\./g, '\\.');
    const result = url.replace(new RegExp(`http://${escapedIp}:\\d+`), storageBase);
    console.log('[fixStorageUrl] Port mismatch fixed, result:', result);
    return result;
  }

  console.log('[fixStorageUrl] No transformation needed, returning as-is:', url);
  return url;
};
