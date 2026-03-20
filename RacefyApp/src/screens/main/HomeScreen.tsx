import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLiveActivityContext } from '../../hooks/useLiveActivity';
import { useNotifications } from '../../hooks/useNotifications';
import { useHomeData } from '../../hooks/useHomeData';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { useRefreshOn } from '../../services/refreshEvents';
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
  ActivitiesFeedPreview,
} from './home/components';
import {
  ActivityCard,
  EventCard,
  LiveEventCard,
  EmptyState,
  Loading,
  TipCard,
  ScreenContainer,
  DraftsReminderModal,
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
  const insets = useSafeAreaInsets();
  const tabBarPaddingBottom = 60 + insets.bottom + spacing.md;
  const { t, i18n } = useTranslation();
  const { isTracking, isPaused, currentStats } = useLiveActivityContext();
  const { unreadCount, refresh: refreshNotifications } = useNotifications();

  // Listen for notification refresh events
  useRefreshOn('notifications', refreshNotifications);

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

  // Drafts reminder modal — once per app session
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [reminderDrafts, setReminderDrafts] = useState<import('../../types/api').DraftPost[]>([]);
  const draftsReminderShown = useRef(false);

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

  // Check for pending drafts once per session
  useEffect(() => {
    if (!isAuthenticated || draftsReminderShown.current) return;

    const checkDrafts = async () => {
      try {
        const response = await api.getDrafts({ page: 1, per_page: 5 });
        logger.debug('general', 'Drafts reminder check', { count: response.data.length });
        if (response.data.length > 0) {
          setReminderDrafts(response.data);
          setShowDraftsModal(true);
          draftsReminderShown.current = true;
        }
      } catch (err) {
        logger.debug('general', 'Failed to check drafts for reminder', { error: err });
      }
    };

    checkDrafts();
  }, [isAuthenticated]);

  const navigateToAuth = (screen: 'Login' | 'Register') => {
    navigation.getParent()?.navigate('Auth', { screen });
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPaddingBottom }]}
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
          userTier={user?.subscription?.tier}
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
              navigation.getParent()?.navigate('PostForm', {});
            }}
            onFindEvents={() => {
              navigation.getParent()?.navigate('EventForm', {});
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

        {/* Recent Activities Feed Preview */}
        <ActivitiesFeedPreview
          onActivityPress={(activityId) => {
            navigation.getParent()?.navigate('ActivityDetail', { activityId });
          }}
          onViewAllPress={() => {
            navigation.navigate('Feed');
          }}
          onLoginPress={() => navigateToAuth('Login')}
          limit={5}
        />
      </ScrollView>

      {isAuthenticated && (
        <DraftsReminderModal
          visible={showDraftsModal}
          onClose={() => setShowDraftsModal(false)}
          drafts={reminderDrafts}
          onPublish={async (postId) => {
            await api.publishDraft(postId);
            const remaining = reminderDrafts.filter((d) => d.id !== postId);
            setReminderDrafts(remaining);
            if (remaining.length === 0) {
              setShowDraftsModal(false);
            }
          }}
          onEdit={(draft) => {
            navigation.getParent()?.navigate('PostForm', { postId: draft.id });
          }}
          onViewAll={() => {
            navigation.navigate('Profile', { initialTab: 'drafts' });
          }}
        />
      )}
    </ScreenContainer>
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
