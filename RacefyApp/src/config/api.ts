import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get config from app.config.ts extra field (loaded from .env)
const extra = Constants.expoConfig?.extra ?? {};
const LOCAL_IP = extra.apiLocalIp || '192.168.1.100';
const LOCAL_PORT = extra.apiLocalPort || '8080';
const PRODUCTION_URL = extra.apiProductionUrl || 'https://api.racefy.app/api';

// API Base URL configuration
const getBaseUrl = (): string => {
  if (__DEV__) {
    // Development - API runs via Laravel Sail/Docker
    if (Platform.OS === 'android') {
      // Android Emulator uses 10.0.2.2 to access host machine's localhost
      return `http://10.0.2.2:${LOCAL_PORT}/api`;
    } else if (Platform.OS === 'ios') {
      // iOS Simulator can use localhost directly
      return `http://localhost:${LOCAL_PORT}/api`;
    }
    // Physical device / Expo Go - use your computer's local IP from .env
    return `http://${LOCAL_IP}:${LOCAL_PORT}/api`;
  }
  // Production
  return PRODUCTION_URL;
};

export const API_BASE_URL = getBaseUrl();
