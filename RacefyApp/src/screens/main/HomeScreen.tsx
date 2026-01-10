import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLiveActivity } from '../../hooks/useLiveActivity';
import { api } from '../../services/api';
import { spacing } from '../../theme';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../navigation/types';

import {
  ConnectionErrorBanner,
  HomeHeader,
  AuthCard,
  UpcomingEventsPreview,
  OngoingEventsPreview,
  ActivitiesFeedPreview,
  DynamicGreeting,
  WeeklyStatsCard,
  QuickActionsBar,
  LiveActivityBanner,
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
  const { colors } = useTheme();
  const { isTracking, isPaused, currentStats } = useLiveActivity();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    checked: false,
    connected: true,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
    // Increment refresh key to force remounting of preview components
    setRefreshKey((prev) => prev + 1);
    setRefreshing(false);
  }, [checkConnection]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const navigateToAuth = (screen: 'Login' | 'Register') => {
    navigation.getParent()?.navigate('Auth', { screen });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
          userAvatar={user?.avatar}
          isAuthenticated={isAuthenticated}
          onNotificationPress={() => {
            // TODO: Navigate to notifications screen
            console.log('Notifications pressed');
          }}
          onAvatarPress={() => {
            navigation.navigate('Profile');
          }}
        />

        {/* Live Activity Banner - shows when recording */}
        <LiveActivityBanner
          isActive={isTracking}
          isPaused={isPaused}
          duration={currentStats.duration}
          distance={currentStats.distance}
          onPress={() => {
            navigation.navigate('Record');
          }}
        />

        {/* Dynamic Greeting with time-based message */}
        <DynamicGreeting
          userName={user?.name}
          isAuthenticated={isAuthenticated}
        />

        {/* Auth Card for non-authenticated users */}
        {!isAuthenticated && (
          <AuthCard
            onSignIn={() => navigateToAuth('Login')}
            onSignUp={() => navigateToAuth('Register')}
          />
        )}

        {/* Quick Actions for authenticated users */}
        {isAuthenticated && (
          <QuickActionsBar
            onStartActivity={() => {
              navigation.navigate('Record');
            }}
            onCreatePost={() => {
              navigation.navigate('Feed', { openComposer: true });
            }}
            onFindEvents={() => {
              navigation.navigate('Events');
            }}
          />
        )}

        {/* Weekly Stats Card for authenticated users */}
        {isAuthenticated && <WeeklyStatsCard key={`stats-${refreshKey}`} />}

        {/* Activities Feed */}
        <ActivitiesFeedPreview
          key={`activities-${refreshKey}`}
          onActivityPress={(activityId) => {
            navigation.getParent()?.navigate('ActivityDetail', { activityId });
          }}
          onViewAllPress={() => navigation.navigate('Feed')}
          onLoginPress={() => navigateToAuth('Login')}
          limit={3}
        />

        {/* Ongoing Events */}
        <OngoingEventsPreview
          key={`ongoing-${refreshKey}`}
          onEventPress={(eventId) => {
            navigation.getParent()?.navigate('EventDetail', { eventId });
          }}
          onViewAllPress={() => navigation.navigate('Events', { initialFilter: 'ongoing' })}
          limit={3}
        />

        {/* Upcoming Events */}
        <UpcomingEventsPreview
          key={`upcoming-${refreshKey}`}
          onEventPress={(eventId) => {
            navigation.getParent()?.navigate('EventDetail', { eventId });
          }}
          onViewAllPress={() => navigation.navigate('Events', { initialFilter: 'upcoming' })}
          limit={3}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
});
