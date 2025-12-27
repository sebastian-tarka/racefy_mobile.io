import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/hooks/useAuth';
import { AppNavigator } from './src/navigation';
import { colors } from './src/theme';

// Initialize i18n
import './src/i18n';
import { loadSavedLanguage } from './src/i18n';

// Register background location task (must be at top level)
import './src/services/backgroundLocation';

export default function App() {
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" backgroundColor={colors.background} />
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
