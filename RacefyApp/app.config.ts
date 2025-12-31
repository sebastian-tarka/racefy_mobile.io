import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Racefy',
  slug: 'RacefyApp',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#10b981',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.racefy.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Racefy needs access to your location to track your activities and show your route on the map.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Racefy needs access to your location to track your activities in the background and show your route on the map.',
      NSLocationAlwaysUsageDescription:
        'Racefy needs access to your location to track your activities in the background.',
      NSMotionUsageDescription:
        'Racefy uses motion data to improve activity tracking accuracy.',
      NSCameraUsageDescription:
        'Racefy needs camera access to take photos for your activities and posts.',
      NSPhotoLibraryUsageDescription:
        'Racefy needs photo library access to add photos to your activities and posts.',
      // Required for background location tracking
      UIBackgroundModes: ['location', 'fetch'],
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#10b981',
    },
    edgeToEdgeEnabled: true,
    package: 'com.racefy.app',
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'VIBRATE',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-font',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Racefy needs access to your location to track your activities.',
        locationAlwaysPermission:
          'Racefy needs background location access to track activities even when the app is in the background.',
        locationWhenInUsePermission:
          'Racefy needs location access to track your activities and show your route.',
        // Enable background location for Android
        isAndroidBackgroundLocationEnabled: true,
        // Enable background location for iOS
        isIosBackgroundLocationEnabled: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Racefy needs access to your photos to add images to activities and posts.',
        cameraPermission:
          'Racefy needs camera access to take photos for your activities.',
      },
    ],
    '@react-native-community/datetimepicker',
    'expo-video',
  ],
  extra: {
    apiLocalIp: process.env.API_LOCAL_IP || '192.168.1.100',
    apiProductionUrl: process.env.API_PRODUCTION_URL || 'https://api.racefy.app/api',
    apiLocalPort: process.env.API_LOCAL_PORT || '8080',
  },
});
