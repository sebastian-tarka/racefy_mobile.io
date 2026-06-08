// Jest configuration using the Expo preset (handles RN/Expo transforms).
module.exports = {
  preset: 'jest-expo',
  // RNTL v12.4+ registers its jest matchers automatically — no extend-expect setup needed.
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  // Allow Jest to transform the RN/Expo ESM packages our code touches.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@rnmapbox/.*|@react-native-community/.*|react-native-reanimated))',
  ],
};
