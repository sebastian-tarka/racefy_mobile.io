import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLiveActivityContext } from '../../hooks/useLiveActivity';
import { useNotifications } from '../../hooks/useNotifications';
import { useHomeData } from '../../hooks/useHomeData';
import { api } from '../../services/api';
import { spacing } from '../../theme';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../navigation/types';
import type { TrainingTip } from '../../types/api';

import {
  ConnectionErrorBanner,
  HomeHeader,
  AuthCard,
  DynamicGreeting,
  WeeklyStatsCard,
  QuickActionsBar,
  LiveActivityBanner,
} from './home/components';
import {
  ActivityCard,
  EventCard,
  LiveEventCard,
  EmptyState,
  Loading,
  TipCard,
} from '../../components';

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
  const { t, i18n } = useTranslation();
  const { isTracking, isPaused, currentStats } = useLiveActivityContext();
  const { unreadCount } = useNotifications();

  // Use new unified home data hook
  const {
    data: homeData,
    loading,
    refetch,
    liveEvents,
    upcomingEvents,
    recentActivities,
    hasLiveEvents,
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
    await Promise.all([refetch(), loadAvailableTips()]);
    setRefreshing(false);
  }, [checkConnection, refetch, loadAvailableTips]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    loadAvailableTips();
  }, [loadAvailableTips]);

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

        {/* Dynamic Greeting with time-based message */}
        <DynamicGreeting
          userName={user?.name}
          isAuthenticated={isAuthenticated}
        />

        {/* Training Tips - shown when available */}
        {isAuthenticated && availableTips.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('training.tips.sectionTitle')}
            </Text>
            {availableTips.slice(0, 1).map((tip) => (
              <TipCard
                key={tip.id}
                tip={tip}
                onPress={() => {
                  navigation.getParent()?.navigate('TipDetail', { tipId: tip.id });
                }}
              />
            ))}
          </View>
        )}

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
        {isAuthenticated && <WeeklyStatsCard />}

        {/* Loading State */}
        {loading && !homeData && <Loading />}

        {/* Live Events with AI Commentary */}
        {hasLiveEvents && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('home.ongoingEvents')}
              </Text>
              <Text style={[styles.sectionBadge, { color: colors.error }]}>
                {t('home.live')}
              </Text>
            </View>
            {liveEvents.map((event) => (
              <LiveEventCard
                key={event.id}
                event={event}
                onPress={() => {
                  navigation.getParent()?.navigate('EventDetail', { eventId: event.id });
                }}
                onBoostComplete={() => refetch()}
              />
            ))}
          </View>
        )}

        {/* No Live Events Message */}
        {!loading && !hasLiveEvents && (
          <EmptyState
            icon="chatbubbles-outline"
            title={t('home.noLiveEvents')}
            message={t('home.noLiveEventsMessage')}
          />
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('home.upcomingEvents')}
              </Text>
            </View>
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => {
                  navigation.getParent()?.navigate('EventDetail', { eventId: event.id });
                }}
              />
            ))}
          </View>
        )}

        {/* Recent Activities */}
        {recentActivities.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('home.activities')}
              </Text>
            </View>
            {recentActivities.slice(0, 3).map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onPress={() => {
                  navigation.getParent()?.navigate('ActivityDetail', {
                    activityId: activity.id,
                  });
                }}
              />
            ))}
          </View>
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
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
