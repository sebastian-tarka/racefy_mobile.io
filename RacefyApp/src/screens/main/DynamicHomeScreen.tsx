import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../navigation/types';
import type { TrainingTip } from '../../types/api';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_MARGIN } from '../../navigation/AppNavigator';

// Hooks
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLiveActivityContext } from '../../hooks/useLiveActivity';
import { useNotifications } from '../../hooks/useNotifications';
import { useHomeData } from '../../hooks/useHomeData';
import { useHomeConfig } from '../../hooks/useHomeConfig';
import { useWeeklyStreak } from '../../hooks/useWeeklyStreak';

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
  LiveActivityBanner,
  PrimaryCTA,
  SectionRenderer,
  WeeklyStatsCardV2,
  WeeklyStreakCard,
  QuickActionsBarV2,
  CollapsibleTipCard,
  LiveEventsCard,
} from './home/components';
import { Loading, FadeInView } from '../../components';

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
  const { t, i18n } = useTranslation();
  const { isTracking, isPaused, currentStats } = useLiveActivityContext();
  const { unreadCount } = useNotifications();
  const weeklyStreakData = useWeeklyStreak();
  const insets = useSafeAreaInsets();

  // Calculate padding to prevent content from being hidden under floating tab bar
  const tabBarTotalHeight = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + insets.bottom;
  const scrollPaddingBottom = tabBarTotalHeight + spacing.lg; // Tab bar height + extra spacing

  // Config from /home/config endpoint
  const {
    config,
    meta,
    loading: configLoading,
    sortedSections,
    refetch: refetchConfig,
  } = useHomeConfig();

  // Data for sections from /home endpoint
  const {
    refetch: refetchData,
    upcomingEvents,
    recentActivities,
    liveEvents,
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
  const [availableTips, setAvailableTips] = useState<TrainingTip[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);

  // Get greeting based on time of day
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 21 || hour < 5) return t('home.greeting.night');
    if (hour >= 17) return t('home.greeting.evening');
    if (hour >= 12) return t('home.greeting.afternoon');
    return t('home.greeting.morning');
  }, [t]);

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

  const loadAvailableTips = useCallback(async () => {
    if (!isAuthenticated) {
      setAvailableTips([]);
      return;
    }

    try {
      setLoadingTips(true);
      const tips = await api.getAvailableTips();
      setAvailableTips(tips);
    } catch (error) {
      // Silently fail - tips are optional feature
      setAvailableTips([]);
    } finally {
      setLoadingTips(false);
    }
  }, [isAuthenticated]);

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
    await Promise.all([refetchConfig(), refetchData(), loadAvailableTips()]);
    setRefreshing(false);
  }, [checkConnection, refetchConfig, refetchData, loadAvailableTips]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    loadAvailableTips();
  }, [loadAvailableTips]);

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

  // Quick actions callbacks
  const handleStartTraining = useCallback(() => {
    navigation.navigate('Record');
  }, [navigation]);

  const handleCreatePost = useCallback(() => {
    navigation.navigate('Feed', { openComposer: true });
  }, [navigation]);

  const handleFindEvents = useCallback(() => {
    navigation.navigate('Events');
  }, [navigation]);

  const handleStatsDetails = useCallback(() => {
    navigation.navigate('Profile', { initialTab: 'stats' });
  }, [navigation]);

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
      onStartActivity: handleStartTraining,
      onCreatePost: handleCreatePost,
      onFindEvents: handleFindEvents,
      onSectionCtaPress: handleSectionCtaPress,
    }),
    [navigation, navigateToAuth, handleSectionCtaPress, handleStartTraining, handleCreatePost, handleFindEvents]
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Connection Error Banner - no animation, always visible */}
        {connectionStatus.checked && !connectionStatus.connected && (
          <ConnectionErrorBanner
            error={connectionStatus.error}
            apiUrl={api.getBaseUrl()}
            onRetry={checkConnection}
          />
        )}

        {/* Live Activity Banner - no animation, shows when recording */}
        <LiveActivityBanner
          isActive={isTracking}
          isPaused={isPaused}
          duration={currentStats.duration}
          distance={currentStats.distance}
          onPress={() => {
            navigation.navigate('Record');
          }}
        />

        {/* Header - with staggered fade-in */}
        <FadeInView delay={50}>
          <HomeHeader
            userName={user?.name}
            userAvatar={user?.avatar}
            greeting={getGreeting()}
            isAuthenticated={isAuthenticated}
            unreadCount={unreadCount}
            onNotificationPress={() => {
              navigation.getParent()?.navigate('Notifications');
            }}
            onAvatarPress={() => {
              navigation.navigate('Profile');
            }}
          />
        </FadeInView>

        {/* Loading State */}
        {isLoading && <Loading />}

        {/* Primary CTA - prominent "Start Training" button (hidden when recording) */}
        {!isTracking && (
          <FadeInView delay={120}>
            {config?.primary_cta && (
              <PrimaryCTA
                cta={config.primary_cta}
                onPress={handlePrimaryCtaPress}
              />
            )}
          </FadeInView>
        )}

        {/* Weekly Streak - authenticated users only */}
        {isAuthenticated && !weeklyStreakData.isLoading && (
          <FadeInView delay={200}>
            <WeeklyStreakCard
              activeDays={weeklyStreakData.weekActivity}
              todayIndex={weeklyStreakData.todayIndex}
              goalDays={weeklyStreakData.goalDays}
              completedDays={weeklyStreakData.completedDays}
            />
          </FadeInView>
        )}

        {/* Weekly Stats - authenticated users only */}
        {isAuthenticated && (
          <FadeInView delay={300}>
            <WeeklyStatsCardV2 onPress={handleStatsDetails} />
          </FadeInView>
        )}

        {/* Training Tips - collapsible, shown when available */}
        {isAuthenticated && availableTips.length > 0 && (
          <FadeInView delay={400}>
            <CollapsibleTipCard
              tip={availableTips[0]}
              defaultExpanded={false}
            />
          </FadeInView>
        )}

        {/* Quick Actions - authenticated users only */}
        {isAuthenticated && (
          <FadeInView delay={480}>
            <QuickActionsBarV2
              onCreatePost={handleCreatePost}
              onFindEvents={handleFindEvents}
            />
          </FadeInView>
        )}

        {/* Live Events - compact card */}
        {liveEvents.length > 0 && (
          <FadeInView delay={540}>
            <LiveEventsCard
              events={liveEvents}
              onPress={(eventId) => {
                navigation.getParent()?.navigate('EventDetail', { eventId });
              }}
            />
          </FadeInView>
        )}

        {/* Sections - rendered based on config, sorted by priority */}
        {!isLoading && sortedSections.length > 0 && (
          <FadeInView delay={560}>
            <SectionRenderer
              sections={sortedSections}
              data={sectionData}
              callbacks={sectionCallbacks}
              isAuthenticated={isAuthenticated}
            />
          </FadeInView>
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
    // paddingBottom calculated dynamically in component to account for tab bar + safe area
  },
});
