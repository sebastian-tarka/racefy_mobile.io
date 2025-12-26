import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// Get config from app.config.ts extra field (loaded from .env)
const extra = Constants.expoConfig?.extra ?? {};
const LOCAL_IP = extra.apiLocalIp || '192.168.1.100';
const LOCAL_PORT = extra.apiLocalPort || '8080';
const PRODUCTION_URL = extra.apiProductionUrl || 'https://api.racefy.app/api';

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
