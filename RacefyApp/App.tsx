import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/hooks/useAuth';
import { ThemeProvider, useTheme } from './src/hooks/useTheme';
import { AppNavigator } from './src/navigation';

// Initialize i18n
import './src/i18n';
import { loadSavedLanguage } from './src/i18n';

// Register background location task (must be at top level)
import './src/services/backgroundLocation';

function AppContent() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    loadSavedLanguage();
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
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
