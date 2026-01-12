import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { useAuth } from './useAuth';
import type { Notification } from '../types/api';

export function useNotifications(pollInterval = 30000) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await api.getUnreadNotificationCount();
      setUnreadCount(response.unread_count);
      // Unread count updated
    } catch (err) {
      logger.error('api', 'Failed to fetch unread count', { error: err });
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await api.markNotificationAsRead(notificationId);
      // Decrement unread count locally
      setUnreadCount(prev => Math.max(0, prev - 1));
      // Marked as read
    } catch (err) {
      logger.error('api', 'Failed to mark notification as read', { error: err });
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.markAllNotificationsAsRead();
      setUnreadCount(0);
      // Marked all as read
      return response.marked_count;
    } catch (err) {
      logger.error('api', 'Failed to mark all notifications as read', { error: err });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // App has come to the foreground
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App foregrounded, refreshing count
        fetchUnreadCount();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [fetchUnreadCount]);

  // Setup polling
  useEffect(() => {
    fetchUnreadCount();

    if (isAuthenticated) {
      intervalRef.current = setInterval(fetchUnreadCount, pollInterval);
      // Started polling
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        // Stopped polling
      }
    };
  }, [fetchUnreadCount, isAuthenticated, pollInterval]);

  return {
    unreadCount,
    loading,
    refresh: fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };
}

/**
 * Get avatar URL from notification data
 * Handles both full URLs and relative paths (old format)
 */
export function getNotificationAvatarUrl(avatar: string | null, apiBaseUrl: string): string | null {
  if (!avatar) return null;

  // Already a full URL
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }

  // Already starts with /
  if (avatar.startsWith('/')) {
    return `${apiBaseUrl}${avatar}`;
  }

  // Relative path (old format)
  return `${apiBaseUrl}/storage/${avatar}`;
}

/**
 * Get icon name for notification type
 */
export function getNotificationIcon(type: Notification['type']): string {
  switch (type) {
    case 'likes':
      return 'heart';
    case 'comments':
      return 'chatbubble';
    case 'follows':
      return 'person-add';
    case 'mentions':
      return 'at';
    case 'boosts':
      return 'flash';
    case 'activity_reactions':
      return 'happy';
    case 'messages':
      return 'mail';
    case 'event_reminders':
      return 'calendar';
    case 'ai_post_ready':
      return 'document-text';
    default:
      return 'notifications';
  }
}

/**
 * Get icon color for notification type
 */
export function getNotificationIconColor(type: Notification['type']): string {
  switch (type) {
    case 'likes':
      return '#ef4444'; // red
    case 'comments':
      return '#3b82f6'; // blue
    case 'follows':
      return '#10b981'; // emerald
    case 'mentions':
      return '#8b5cf6'; // purple
    case 'boosts':
      return '#f97316'; // orange
    case 'activity_reactions':
      return '#eab308'; // yellow
    case 'messages':
      return '#3b82f6'; // blue
    case 'event_reminders':
      return '#10b981'; // emerald
    case 'ai_post_ready':
      return '#3b82f6'; // blue
    default:
      return '#6b7280'; // gray
  }
}
