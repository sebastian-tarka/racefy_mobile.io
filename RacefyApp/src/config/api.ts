import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { logger } from '../services/logger';

// Get config from app.config.ts extra field (loaded from .env)
const extra = Constants.expoConfig?.extra ?? {};
const LOCAL_IP = extra.apiLocalIp || '192.168.1.100';
const LOCAL_PORT = extra.apiLocalPort || '8080';
const API_URL = extra.apiUrl || 'https://api.racefy.app/api';
const API_STAGING_URL = extra.apiStagingUrl || 'https://app.dev.racefy.io/api';
const APP_ENV = extra.appEnv || 'production';
const USE_STAGING_IN_DEV = extra.useStagingInDev === true;

// Xdebug debugging - only active in development mode
export const XDEBUG_ENABLED = __DEV__ && extra.xdebugEnabled === true;

// Mapbox configuration
const MAPBOX_TOKEN = extra.mapboxAccessToken || null;
const MAPBOX_FEATURE_ENABLED = extra.mapboxEnabled !== false;

// Only use Mapbox if both token is set AND feature is enabled
export const MAPBOX_ACCESS_TOKEN = MAPBOX_FEATURE_ENABLED ? MAPBOX_TOKEN : null;

// Export environment info for debugging
export { APP_ENV };

// API Base URL configuration
const getBaseUrl = (): string => {
  if (__DEV__) {
    // Option to use staging API in development mode
    if (USE_STAGING_IN_DEV) {
      logger.debug('api', 'Using staging API in dev mode', { url: API_STAGING_URL });
      return API_STAGING_URL;
    }

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
  // Production / Staging (based on APP_ENV)
  return API_URL;
};

export const API_BASE_URL = getBaseUrl();

// Get the base host for storage URLs (without /api)
const getStorageBaseUrl = (): string => {
  if (__DEV__) {
    // When using staging API in dev mode, use staging storage URL
    if (USE_STAGING_IN_DEV) {
      return API_STAGING_URL.replace('/api', '');
    }

    if (Device.isDevice) {
      return `http://${LOCAL_IP}:${LOCAL_PORT}`;
    }
    if (Platform.OS === 'android') {
      return `http://10.0.2.2:${LOCAL_PORT}`;
    }
    return `http://localhost:${LOCAL_PORT}`;
  }
  // Production / Staging - strip /api from the URL
  return API_URL.replace('/api', '');
};

/**
 * Fix storage URLs returned from API
 * Replaces localhost/127.0.0.1 with the correct host for the current platform
 * Also fixes port mismatches when the API returns wrong port
 */
export const fixStorageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  const storageBase = getStorageBaseUrl();
  logger.debug('api', 'fixStorageUrl input', { url, storageBase, LOCAL_IP, LOCAL_PORT });

  // Handle relative URLs (e.g., /storage/videos/...)
  if (url.startsWith('/')) {
    const result = `${storageBase}${url}`;
    logger.debug('api', 'fixStorageUrl: relative URL resolved', { result });
    return result;
  }

  // Replace localhost with the correct host
  if (url.includes('localhost:')) {
    const result = url.replace(/http:\/\/localhost:\d+/, storageBase);
    logger.debug('api', 'fixStorageUrl: localhost replaced', { result });
    return result;
  }

  // Replace 127.0.0.1 with the correct host
  if (url.includes('127.0.0.1:')) {
    const result = url.replace(/http:\/\/127\.0\.0\.1:\d+/, storageBase);
    logger.debug('api', 'fixStorageUrl: 127.0.0.1 replaced', { result });
    return result;
  }

  // Replace 10.0.2.2 (Android emulator localhost) when on physical device
  if (url.includes('10.0.2.2:')) {
    const result = url.replace(/http:\/\/10\.0\.2\.2:\d+/, storageBase);
    logger.debug('api', 'fixStorageUrl: 10.0.2.2 replaced', { result });
    return result;
  }

  // Fix port mismatch: API might return URLs with wrong port (e.g., 8000 instead of 8080)
  // Replace any URL with the configured LOCAL_IP but wrong port
  if (__DEV__ && url.includes(LOCAL_IP)) {
    const escapedIp = LOCAL_IP.replace(/\./g, '\\.');
    const result = url.replace(new RegExp(`http://${escapedIp}:\\d+`), storageBase);
    logger.debug('api', 'fixStorageUrl: port mismatch fixed', { result });
    return result;
  }

  // In dev mode, replace any private IP address with the correct storage base
  // This handles cases where the API returns URLs with the server's actual IP
  if (__DEV__) {
    // Match common private IP ranges: 10.x.x.x, 192.168.x.x, 172.16-31.x.x
    const privateIpPattern = /http:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):\d+/;
    if (privateIpPattern.test(url)) {
      const result = url.replace(privateIpPattern, storageBase);
      logger.debug('api', 'fixStorageUrl: private IP replaced', { result });
      return result;
    }
  }

  logger.debug('api', 'fixStorageUrl: no transformation needed', { url });
  return url;
};
