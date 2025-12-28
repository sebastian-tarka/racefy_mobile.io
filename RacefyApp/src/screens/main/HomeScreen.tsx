import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { colors, spacing } from '../../theme';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../navigation/types';

import {
  ConnectionErrorBanner,
  HomeHeader,
  HeroSection,
  AuthCard,
  FeaturesList,
  StatsSection,
  UpcomingEventsPreview,
} from './home/components';

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>;

type ConnectionStatus = {
  checked: boolean;
  connected: boolean;
  latency?: number;
  error?: string;
};

export function HomeScreen({ navigation }: Props) {
  const { user, isAuthenticated } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    checked: false,
    connected: true,
  });
  const [refreshing, setRefreshing] = useState(false);

  const checkConnection = useCallback(async () => {
    const result = await api.checkHealth();
    setConnectionStatus({
      checked: true,
      connected: result.connected,
      latency: result.latency,
      error: result.error,
    });
    return result.connected;
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkConnection();
    setRefreshing(false);
  }, [checkConnection]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const navigateToAuth = (screen: 'Login' | 'Register') => {
    navigation.getParent()?.navigate('Auth', { screen });
  };

  const navigateToScreen = (screen: keyof MainTabParamList, requiresAuth: boolean) => {
    if (requiresAuth && !isAuthenticated) {
      navigateToAuth('Login');
    } else {
      navigation.navigate(screen);
    }
  };

  const features = [
    {
      icon: 'newspaper-outline' as const,
      titleKey: 'home.socialFeed',
      descriptionKey: 'home.socialFeedDesc',
      onPress: () => navigateToScreen('Feed', true),
    },
    {
      icon: 'calendar-outline' as const,
      titleKey: 'home.events',
      descriptionKey: 'home.eventsDesc',
      onPress: () => navigateToScreen('Events', false),
    },
    {
      icon: 'fitness-outline' as const,
      titleKey: 'home.activities',
      descriptionKey: 'home.activitiesDesc',
      onPress: () => navigateToScreen('Profile', true),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {connectionStatus.checked && !connectionStatus.connected && (
          <ConnectionErrorBanner
            error={connectionStatus.error}
            apiUrl={api.getBaseUrl()}
            onRetry={checkConnection}
          />
        )}

        <HomeHeader
          userName={user?.name}
          isAuthenticated={isAuthenticated}
        />

        <HeroSection />

        {!isAuthenticated && (
          <AuthCard
            onSignIn={() => navigateToAuth('Login')}
            onSignUp={() => navigateToAuth('Register')}
          />
        )}

        <UpcomingEventsPreview
          onEventPress={(eventId) => {
            navigation.getParent()?.navigate('EventDetail', { eventId });
          }}
          onViewAllPress={() => navigation.navigate('Events')}
          limit={3}
        />

        <FeaturesList features={features} />

        <StatsSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
});
