import { ExpoConfig, ConfigContext } from 'expo/config';

// Determine API URL based on APP_ENV
const getApiUrl = (): string => {
  const env = process.env.APP_ENV || 'production';

  if (env === 'staging') {
    return process.env.API_STAGING_URL || 'https://app.dev.racefy.io/api';
  }

  return process.env.API_PRODUCTION_URL || 'https://api.racefy.app/api';
};

// Determine Firebase config file based on APP_ENV
const getGoogleServicesFile = (): string => {
  const env = process.env.APP_ENV || 'production';

  switch (env) {
    case 'development':
      return './google-services-dev.json';
    case 'staging':
      return './google-services-staging.json';
    case 'production':
      return './google-services-production.json';
    default:
      return './google-services-production.json';
  }
};

// Determine iOS Firebase config file based on APP_ENV
const getGoogleServicesFileiOS = (): string => {
  const env = process.env.APP_ENV || 'production';

  switch (env) {
    case 'development':
      return './GoogleService-Info-dev.plist';
    case 'staging':
      return './GoogleService-Info-staging.plist';
    case 'production':
      return './GoogleService-Info-production.plist';
    default:
      return './GoogleService-Info-production.plist';
  }
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Racefy',
  slug: 'RacefyApp',
  version: '1.5.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#10b981',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.racefy.app',
    buildNumber: '7',
    googleServicesFile: getGoogleServicesFileiOS(),
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
        'Racefy needs camera access to take photos and videos for your activities and posts.',
      NSMicrophoneUsageDescription:
        'Racefy needs microphone access to record audio with videos.',
      NSPhotoLibraryUsageDescription:
        'Racefy needs photo library access to select photos and videos from your gallery.',
      NSPhotoLibraryAddUsageDescription:
        'Racefy needs permission to save photos and videos to your photo library.',
      // Required for background location tracking and push notifications
      UIBackgroundModes: ['location', 'fetch', 'remote-notification'],
      // Google Sign-In iOS URL scheme (reversed client ID)
      ...(process.env.GOOGLE_IOS_CLIENT_ID ? {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              process.env.GOOGLE_IOS_CLIENT_ID.split('.').reverse().join('.'),
            ],
          },
        ],
      } : {}),
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/splash-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    package: 'com.racefy.app',
    versionCode: 7,
    googleServicesFile: getGoogleServicesFile(),
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
      'POST_NOTIFICATIONS',
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
    'expo-secure-store',
    '@rnmapbox/maps',
    '@react-native-google-signin/google-signin',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#10b981',
        defaultChannel: 'default',
      },
    ],
  ],
  extra: {
    appEnv: process.env.APP_ENV || 'production',
    apiLocalIp: process.env.API_LOCAL_IP || '192.168.1.100',
    apiLocalPort: process.env.API_LOCAL_PORT || '8080',
    apiUrl: getApiUrl(),
    apiStagingUrl: process.env.API_STAGING_URL || 'https://app.dev.racefy.io/api',
    useStagingInDev: process.env.USE_STAGING_IN_DEV === 'true',
    xdebugEnabled: process.env.XDEBUG_ENABLED === 'true',
    mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || null,
    mapboxEnabled: process.env.MAPBOX_ENABLED !== 'false', // Default to true
    // Debug logging configuration
    logEnabled: process.env.LOG_ENABLED === 'true',
    logLevel: process.env.LOG_LEVEL || 'debug',
    logPersist: process.env.LOG_PERSIST !== 'false',
    logMaxEntries: parseInt(process.env.LOG_MAX_ENTRIES || '2000', 10),
    logCategories: process.env.LOG_CATEGORIES || 'all',
    logConsoleOutput: process.env.LOG_CONSOLE_OUTPUT !== 'false',
    // Google Sign-In
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
    googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID || '',
    // Feature flags
    useDynamicHome: process.env.USE_DYNAMIC_HOME === 'true',
    eas: {
      projectId: '6eab0c85-bf5b-4308-96e2-15fcd9c780fe',
    },
  },
});
