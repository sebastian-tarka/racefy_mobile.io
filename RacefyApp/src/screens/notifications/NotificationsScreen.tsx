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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { NotificationItem, ScreenHeader, EmptyState } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { spacing } from '../../theme';
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
          setNotifications(prev => [...prev, ...response.data]);
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
    [loading, page, t]
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

  const navigateToUrl = useCallback(
    (url: string) => {
      logger.nav('Navigating from notification', { url });
      try {
        // Profile: /@username
        if (url.startsWith('/@')) {
          const username = url.substring(2);
          logger.nav('Opening user profile', { username });
          navigation.navigate('UserProfile', { username });
        }
        // Post detail: /posts/{id}
        else if (url.startsWith('/posts/')) {
          const postId = parseInt(url.split('/')[2]);
          logger.nav('Opening post detail', { postId });
          navigation.navigate('PostDetail', { postId });
        }
        // Activity detail: /activities/{id}
        else if (url.startsWith('/activities/')) {
          const activityId = parseInt(url.split('/')[2]);
          logger.nav('Opening activity detail', { activityId });
          navigation.navigate('ActivityDetail', { activityId });
        }
        // Event detail: /events/{id}
        else if (url.startsWith('/events/')) {
          const eventId = parseInt(url.split('/')[2]);
          logger.nav('Opening event detail', { eventId });
          navigation.navigate('EventDetail', { eventId });
        }
        // Messages: /messages?conversation={id}
        else if (url.startsWith('/messages')) {
          const conversationId = url.includes('?conversation=')
            ? parseInt(url.split('?conversation=')[1])
            : undefined;
          logger.nav('Opening messages', { conversationId });
          navigation.navigate('Messages', { conversationId });
        } else {
          logger.warn('navigation', 'Unknown notification URL format', { url });
          Alert.alert(t('common.error'), t('notifications.navigationError'));
        }
      } catch (error) {
        logger.error('navigation', 'Failed to navigate from notification', { error, url });
        Alert.alert(t('common.error'), t('notifications.navigationError'));
      }
    },
    [navigation, t]
  );

  const handleNotificationPress = useCallback(
    async (notification: Notification) => {
      logger.info('navigation', 'Notification pressed', {
        id: notification.id,
        type: notification.type,
      });
      const url = notification.data?.data?.url;

      // Mark as read
      if (!notification.read_at) {
        try {
          await markAsRead(notification.id);
          // Update local state
          setNotifications(prev =>
            prev.map(n =>
              n.id === notification.id
                ? { ...n, read_at: new Date().toISOString() }
                : n
            )
          );
        } catch (error) {
          logger.error('navigation', 'Failed to mark notification as read', {
            error,
            notificationId: notification.id,
          });
        }
      }

      // Navigate if URL exists
      if (url) {
        navigateToUrl(url);
      } else {
        logger.warn('navigation', 'Notification has no URL', {
          notificationId: notification.id,
          type: notification.type,
        });
      }
    },
    [markAsRead, navigateToUrl]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    Alert.alert(
      t('notifications.markAllAsRead'),
      t('notifications.markAllAsReadConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            setMarkingAllAsRead(true);
            try {
              await api.markAllNotificationsAsRead();
              // Update all notifications to read
              setNotifications(prev =>
                prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
              );
              refreshUnreadCount();
              logger.info('navigation', 'Marked all notifications as read');
            } catch (error) {
              logger.error('navigation', 'Failed to mark all notifications as read', { error });
              Alert.alert(t('common.error'), t('notifications.markAllAsReadError'));
            } finally {
              setMarkingAllAsRead(false);
            }
          },
        },
      ]
    );
  }, [t, refreshUnreadCount]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScreenHeader title={t('notifications.title')} />

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
        keyExtractor={item => item.id}
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
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.footerLoader}
            />
          ) : null
        }
      />
    </SafeAreaView>
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
    fontSize: 14,
    fontWeight: '500',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllText: {
    fontSize: 14,
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
