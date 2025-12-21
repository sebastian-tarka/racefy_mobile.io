import { Platform } from 'react-native';

const getBaseUrl = (): string => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Android Emulator uses 10.0.2.2 to access host machine's localhost
      return 'http://10.0.2.2/api';
    } else if (Platform.OS === 'ios') {
      // iOS Simulator can use localhost directly
      return 'http://localhost/api';
    }
    // Physical device - use your computer's local IP
    return 'http://192.168.1.100/api';
  }
  // Production
  return 'https://api.racefy.app/api';
};

export const API_BASE_URL = getBaseUrl();
