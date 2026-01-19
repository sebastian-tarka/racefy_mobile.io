import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../navigation/types';

// Hooks
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLiveActivityContext } from '../../hooks/useLiveActivity';
import { useNotifications } from '../../hooks/useNotifications';
import { useHomeData } from '../../hooks/useHomeData';
import { useHomeConfig } from '../../hooks/useHomeConfig';

// Services
import { api } from '../../services/api';
import { homeAnalytics } from '../../services/homeAnalytics';
import { navigateForCtaActionFromTab } from '../../utils/homeNavigation';

// Theme
import { spacing } from '../../theme';

// Components
import {
  ConnectionErrorBanner,
  HomeHeader,
  DynamicGreeting,
  LiveActivityBanner,
  PrimaryCTA,
  SectionRenderer,
} from './home/components';
import { Loading } from '../../components';

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>;

type ConnectionStatus = {
  checked: boolean;
  connected: boolean;
  latency?: number;
  error?: string;
};

/**
 * DynamicHomeScreen - Config-driven Home screen implementation.
 *
 * This screen renders based entirely on backend configuration from /home/config.
 * Mobile does NOT contain any business logic or decision-making about:
 * - Which sections to show
 * - What the primary CTA should be
 * - Section ordering or prioritization
 *
 * The only responsibilities of this component are:
 * 1. Fetch config from backend
 * 2. Fetch data for sections
 * 3. Render exactly what the backend returns
 * 4. Handle navigation when users tap CTAs
 * 5. Track analytics events
 */
export function DynamicHomeScreen({ navigation }: Props) {
  const { user, isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { i18n } = useTranslation();
  const { isTracking, isPaused, currentStats } = useLiveActivityContext();
  const { unreadCount } = useNotifications();

  // Config from /home/config endpoint
  const {
    config,
    meta,
    loading: configLoading,
    sortedSections,
    refetch: refetchConfig,
  } = useHomeConfig();

  // Data for sections from /home endpoint (only for upcoming_events section)
  const {
    refetch: refetchData,
    upcomingEvents,
  } = useHomeData({
    language: (i18n.language || 'en') as 'en' | 'pl',
    perPage: 15,
    includeActivities: true,
    includeUpcoming: true,
    enableAutoRefresh: true,
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    checked: false,
    connected: true,
  });
  const [refreshing, setRefreshing] = useState(false);

  // Update analytics meta when config changes
  useEffect(() => {
    homeAnalytics.setMeta(meta);
  }, [meta]);

  // Emit home_loaded analytics event when config loads
  useEffect(() => {
    if (config && sortedSections.length > 0) {
      const sectionTypes = sortedSections.map((s) => s.type);
      homeAnalytics.homeLoaded(sectionTypes);
    }
  }, [config, sortedSections]);

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
    await Promise.all([refetchConfig(), refetchData()]);
    setRefreshing(false);
  }, [checkConnection, refetchConfig, refetchData]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Navigation helpers
  const navigateToAuth = useCallback(
    (screen: 'Login' | 'Register') => {
      navigation.getParent()?.navigate('Auth', { screen });
    },
    [navigation]
  );

  const handlePrimaryCtaPress = useCallback(
    (action: string) => {
      if (!config) return;

      // Track analytics
      homeAnalytics.primaryCtaClicked(
        config.primary_cta.action,
        config.primary_cta.label
      );

      // Navigate
      navigateForCtaActionFromTab(navigation, config.primary_cta.action);
    },
    [config, navigation]
  );

  // Handle section CTA press - navigate based on section type
  const handleSectionCtaPress = useCallback(
    (section: any) => {
      homeAnalytics.sectionCtaClicked(section.type, section.cta || 'tap');

      // Navigate based on section type
      switch (section.type) {
        case 'live_activity':
          navigation.navigate('Feed');
          break;
        case 'last_activity_summary':
          // Navigate to activity detail or activities list
          navigation.navigate('Profile');
          break;
        case 'weekly_insight':
          navigation.navigate('Profile');
          break;
        case 'motivation_banner':
          navigation.navigate('Record');
          break;
        case 'weather_insight':
          // Could open weather details or just start activity
          navigation.navigate('Record');
          break;
        default:
          break;
      }
    },
    [navigation]
  );

  // Section callbacks - memoized to prevent re-renders
  const sectionCallbacks = useMemo(
    () => ({
      onEventPress: (eventId: number) => {
        navigation.getParent()?.navigate('EventDetail', { eventId });
      },
      onActivityPress: (activityId: number) => {
        navigation.getParent()?.navigate('ActivityDetail', { activityId });
      },
      onSignIn: () => navigateToAuth('Login'),
      onSignUp: () => navigateToAuth('Register'),
      onStartActivity: () => navigation.navigate('Record'),
      onCreatePost: () => navigation.navigate('Feed', { openComposer: true }),
      onFindEvents: () => navigation.navigate('Events'),
      onSectionCtaPress: handleSectionCtaPress,
    }),
    [navigation, navigateToAuth, handleSectionCtaPress]
  );

  // Section data - memoized to prevent re-renders
  const sectionData = useMemo(
    () => ({
      upcomingEvents,
    }),
    [upcomingEvents]
  );

  const isLoading = configLoading && !config;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Connection Error Banner */}
        {connectionStatus.checked && !connectionStatus.connected && (
          <ConnectionErrorBanner
            error={connectionStatus.error}
            apiUrl={api.getBaseUrl()}
            onRetry={checkConnection}
          />
        )}

        {/* Header - always shown */}
        <HomeHeader
          userName={user?.name}
          userAvatar={user?.avatar}
          isAuthenticated={isAuthenticated}
          unreadCount={unreadCount}
          onNotificationPress={() => {
            navigation.getParent()?.navigate('Notifications');
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

        {/* Dynamic Greeting - client-side time-based */}
        <DynamicGreeting
          userName={user?.name}
          isAuthenticated={isAuthenticated}
        />

        {/* Loading State */}
        {isLoading && <Loading />}

        {/* Primary CTA - from config */}
        {config?.primary_cta && (
          <PrimaryCTA
            cta={config.primary_cta}
            onPress={handlePrimaryCtaPress}
          />
        )}

        {/* Sections - rendered based on config, sorted by priority */}
        {!isLoading && sortedSections.length > 0 && (
          <SectionRenderer
            sections={sortedSections}
            data={sectionData}
            callbacks={sectionCallbacks}
            isAuthenticated={isAuthenticated}
          />
        )}
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
