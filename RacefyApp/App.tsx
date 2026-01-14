import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/hooks/useAuth';
import { ThemeProvider, useTheme } from './src/hooks/useTheme';
import { LiveActivityProvider } from './src/hooks/useLiveActivity';
import { loadGlobalHapticsPreference } from './src/hooks/useHaptics';
import { AppNavigator } from './src/navigation';

// Initialize i18n
import './src/i18n';
import { loadSavedLanguage } from './src/i18n';

function AppContent() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    loadSavedLanguage();
    loadGlobalHapticsPreference();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <LiveActivityProvider>
            <AppContent />
          </LiveActivityProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
