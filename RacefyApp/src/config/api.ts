import { Platform } from 'react-native';

// Your computer's local IP address (find with: ip addr show | grep "inet ")
const LOCAL_IP = '10.27.198.154';

// API Base URL configuration
const getBaseUrl = (): string => {
  if (__DEV__) {
    // Development - API runs on port 8080 via Laravel Sail/Docker
    if (Platform.OS === 'android') {
      // Android Emulator uses 10.0.2.2 to access host machine's localhost
      return 'http://10.0.2.2:8080/api';
    } else if (Platform.OS === 'ios') {
      // iOS Simulator can use localhost directly
      return 'http://localhost:8080/api';
    }
    // Physical device / Expo Go - use your computer's local IP
    return `http://${LOCAL_IP}:8080/api`;
  }
  // Production
  return 'https://api.racefy.app/api';
};

export const API_BASE_URL = getBaseUrl();
