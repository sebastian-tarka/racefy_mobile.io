import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { NotificationItem, ScreenHeader, EmptyState, ScreenContainer } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { emitRefresh } from '../../services/refreshEvents';
import { spacing, fontSize } from '../../theme';
import { resolveNotificationTarget } from '../../utils/notificationRouting';
import type { Notification } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export function NotificationsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { refresh: refreshUnreadCount, markAsRead } = useNotifications();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

  const loadNotifications = useCallback(
    async (refresh = false) => {
      if (loading && !refresh) return;

      setLoading(true);
      const currentPage = refresh ? 1 : page;

      try {
        const response = await api.getNotifications(currentPage, 20);

        if (refresh) {
          setNotifications(response.data);
          setPage(2);
        } else {
          setNotifications((prev) => [...prev, ...response.data]);
          setPage(currentPage + 1);
        }

        setHasMore(response.meta.current_page < response.meta.last_page);
        logger.info('navigation', 'Loaded notifications', {
          page: currentPage,
          count: response.data.length,
          total: response.meta.total,
        });
      } catch (error) {
        logger.error('navigation', 'Failed to load notifications', { error });
        Alert.alert(t('common.error'), t('notifications.loadError'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loading, page, t],
  );

  useEffect(() => {
    loadNotifications(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications(true);
    refreshUnreadCount();
  }, [loadNotifications, refreshUnreadCount]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadNotifications(false);
    }
  }, [hasMore, loading, loadNotifications]);

  /**
   * Open whatever a notification points at.
   *
   * The decision lives in `resolveNotificationTarget`, shared with the push
   * handler — the two used to route independently and drifted apart, which is
   * how a live broadcast opened from the lock screen but produced an error
   * alert from this list.
   */
  const openNotification = useCallback(
    (
      type: string | undefined,
      url: string | null | undefined,
      data?: Notification['data']['data'],
    ) => {
      logger.nav('Navigating from notification', { type, url, data });
      const target = resolveNotificationTarget({ type, url, data });
      if (!target) {
        logger.warn('navigation', 'No route for notification', { type, url, data });
        Alert.alert(t('common.error'), t('notifications.navigationError'));
        return;
      }
      // The union is exhaustive over RootStackParamList, but the pair
      // (screen, params) cannot be correlated through a variable — navigate is
      // overloaded per screen name.
      const navigateAny = navigation.navigate as (screen: string, params?: object) => void;
      navigateAny(target.screen, 'params' in target ? target.params : undefined);
    },
    [navigation, t],
  );

  const handleTrainingWeekFeedbackNavigation = useCallback(
    async (data: Notification['data']['data']) => {
      // If week_id is provided, navigate directly
      if (data.week_id) {
        navigation.navigate('WeekFeedback', { weekId: data.week_id });
        return;
      }

      // Otherwise resolve week_id from week_number via the weeks list
      if (data.week_number) {
        try {
          const weeks = await api.getWeeks();
          const week = weeks.find((w) => w.week_number === data.week_number);
          if (week) {
            navigation.navigate('WeekFeedback', { weekId: week.id });
            return;
          }
          logger.warn('navigation', 'Week not found for notification', {
            weekNumber: data.week_number,
          });
        } catch (error) {
          logger.error('navigation', 'Failed to resolve week for notification', { error });
        }
      }

      // Fallback: go to weeks list
      navigation.navigate('TrainingWeeksList');
    },
    [navigation],
  );

  const handleNotificationPress = useCallback(
    async (notification: Notification) => {
      logger.info('navigation', 'Notification pressed', {
        id: notification.id,
        type: notification.type,
        data: notification.data?.data,
      });
      const url = notification.data?.data?.url;
      const notificationData = notification.data?.data;

      // Mark as read
      if (!notification.read_at) {
        try {
          await markAsRead(notification.id);
          // Update local state
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n,
            ),
          );
          // Emit refresh event so badge updates immediately
          emitRefresh('notifications');
        } catch (error) {
          logger.error('navigation', 'Failed to mark notification as read', {
            error,
            notificationId: notification.id,
          });
        }
      }

      // Handle training_week_feedback directly (has no URL, needs week resolution)
      if (notification.type === 'training_week_feedback' && notificationData) {
        handleTrainingWeekFeedbackNavigation(notificationData);
        return;
      }

      openNotification(notification.type, url, notificationData);
    },
    [markAsRead, openNotification, handleTrainingWeekFeedbackNavigation],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    Alert.alert(t('notifications.markAllAsRead'), t('notifications.markAllAsReadConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        onPress: async () => {
          setMarkingAllAsRead(true);
          try {
            await api.markAllNotificationsAsRead();
            // Update all notifications to read
            setNotifications((prev) =>
              prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })),
            );
            refreshUnreadCount();
            // Emit refresh event so badge updates immediately
            emitRefresh('notifications');
            logger.info('navigation', 'Marked all notifications as read');
          } catch (error) {
            logger.error('navigation', 'Failed to mark all notifications as read', { error });
            Alert.alert(t('common.error'), t('notifications.markAllAsReadError'));
          } finally {
            setMarkingAllAsRead(false);
          }
        },
      },
    ]);
  }, [t, refreshUnreadCount]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <ScreenContainer>
      <ScreenHeader title={t('notifications.title')} showBack onBack={() => navigation.goBack()} />

      {unreadCount > 0 && (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.unreadText, { color: colors.textSecondary }]}>
            {t('notifications.unreadCount', { count: unreadCount })}
          </Text>
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            disabled={markingAllAsRead}
            style={styles.markAllButton}
          >
            {markingAllAsRead ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={16} color={colors.primary} />
                <Text style={[styles.markAllText, { color: colors.primary }]}>
                  {t('notifications.markAllAsRead')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem notification={item} onPress={handleNotificationPress} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            <EmptyState
              icon="notifications-outline"
              title={t('notifications.empty.title')}
              message={t('notifications.empty.description')}
            />
          )
        }
        ListFooterComponent={
          loading && notifications.length > 0 ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.footerLoader} />
          ) : null
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  unreadText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: 4,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  loader: {
    marginTop: spacing.xl * 2,
  },
  footerLoader: {
    marginVertical: spacing.lg,
  },
});
