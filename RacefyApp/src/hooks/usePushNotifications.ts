import { useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { type EventSubscription } from 'expo-modules-core';
import { NavigationContainerRefWithCurrent, ParamListBase } from '@react-navigation/native';
import { pushNotificationService } from '../services/pushNotifications';
import { logger } from '../services/logger';
import type { RootStackParamList } from '../navigation/types';
import type { PushNotificationData, NotificationType } from '../types/api';

export interface UsePushNotificationsOptions {
  /**
   * Navigation ref for handling deep links from cold start
   * Pass this from the root component that has access to NavigationContainer ref
   */
  navigationRef?: NavigationContainerRefWithCurrent<ParamListBase>;
}

export interface UsePushNotificationsResult {
  /**
   * Whether notification permission is granted
   */
  hasPermission: boolean;
  /**
   * Whether the device is registered with the backend
   */
  isRegistered: boolean;
  /**
   * The Expo push token (if available)
   */
  expoPushToken: string | null;
  /**
   * Request notification permissions
   */
  requestPermission: () => Promise<boolean>;
}

/**
 * Hook for managing push notifications
 * Handles:
 * - Permission tracking
 * - Foreground notification listeners
 * - Notification tap handling (deep linking)
 * - Cold start notification handling
 */
export function usePushNotifications(
  options: UsePushNotificationsOptions = {}
): UsePushNotificationsResult {
  const { navigationRef } = options;
  const [hasPermission, setHasPermission] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  // Check initial permission status
  useEffect(() => {
    const checkPermission = async () => {
      const status = await pushNotificationService.getPermissionStatus();
      setHasPermission(status === 'granted');
    };
    checkPermission();
  }, []);

  // Track registration status and token
  useEffect(() => {
    const updateStatus = () => {
      setIsRegistered(pushNotificationService.isDeviceRegistered());
      setExpoPushToken(pushNotificationService.getToken());
    };

    // Initial check
    updateStatus();

    // Check periodically (in case registration happens elsewhere)
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await pushNotificationService.requestPermissions();
    setHasPermission(granted);
    return granted;
  }, []);

  // Handle notification navigation
  const handleNotificationNavigation = useCallback(
    (data: PushNotificationData) => {
      // Get navigation from ref or try hook (hook might not work in all contexts)
      const navigation = navigationRef?.current;

      if (!navigation?.isReady()) {
        logger.warn('general', 'Navigation not ready for notification deep link');
        return;
      }

      const { type, url } = data;

      // Skip navigation if type is undefined or null
      if (!type) {
        logger.warn('general', 'Notification has no type, skipping navigation', { data });
        return;
      }

      logger.info('general', 'Handling notification navigation', { type, url, data });

      // PRIORITY 1: Use backend-provided URL if available
      if (url) {
        const navigated = navigateFromUrl(url, navigation);
        if (navigated) {
          return;
        }
        // If URL navigation failed, fall through to type-based navigation
        logger.warn('general', 'Failed to navigate from URL, trying type-based navigation', { url });
      }

      // PRIORITY 2: Fallback to type-based navigation
      switch (type as NotificationType) {
        case 'likes':
        case 'comments':
        case 'mentions':
          // Navigate to the liked/commented item
          if (data.likeable_type === 'post' || data.commentable_type === 'post' || data.post_id) {
            const postId = data.post_id || data.likeable_id || data.commentable_id;
            if (postId) {
              navigation.navigate('PostDetail', {
                postId: postId,
                focusComments: type === 'comments' || type === 'mentions',
              });
            }
          } else if (data.likeable_type === 'activity' || data.commentable_type === 'activity' || data.activity_id) {
            const activityId = data.activity_id || data.likeable_id || data.commentable_id;
            if (activityId) {
              navigation.navigate('ActivityDetail', {
                activityId: activityId,
              });
            }
          }
          break;

        case 'follows':
          // Navigate to the follower's profile
          if (data.actor_username) {
            navigation.navigate('UserProfile', {
              username: data.actor_username,
            });
          } else {
            logger.warn('general', 'Follow notification missing actor_username', { data });
          }
          break;

        case 'messages':
          // Navigate to conversations list - Chat screen requires participant data
          // which we don't have in the push notification payload
          // The ConversationsList screen will show the conversation at the top
          navigation.navigate('ConversationsList');
          break;

        case 'event_reminders':
          // Navigate to the event
          if (data.event_id) {
            navigation.navigate('EventDetail', {
              eventId: data.event_id,
            });
          }
          break;

        case 'ai_post_ready':
          // Navigate to the draft post or post detail
          if (data.post_id) {
            navigation.navigate('PostDetail', {
              postId: data.post_id,
            });
          }
          break;

        case 'activity_reactions':
        case 'boosts':
          // Navigate to the activity
          if (data.activity_id) {
            navigation.navigate('ActivityDetail', {
              activityId: data.activity_id,
            });
          }
          break;

        case 'points_awarded':
          // Navigate to the event where points were awarded
          if (data.event_id) {
            navigation.navigate('EventDetail', {
              eventId: data.event_id,
            });
          }
          break;

        case 'weekly_summary':
          // Navigate to user's own profile/stats
          navigation.navigate('Profile');
          break;

        default:
          logger.warn('general', 'Unhandled notification type', { type });
          // Don't navigate for unhandled types - just log the warning
      }
    },
    [navigationRef]
  );

  /**
   * Navigate based on backend-provided URL
   * Returns true if navigation succeeded, false otherwise
   */
  const navigateFromUrl = (url: string, navigation: any): boolean => {
    try {
      // Profile: /@username
      if (url.match(/^\/@[\w-]+$/)) {
        const username = url.substring(2);
        navigation.navigate('UserProfile', { username });
        return true;
      }

      // Post: /posts/{id}
      const postMatch = url.match(/^\/posts\/(\d+)$/);
      if (postMatch) {
        navigation.navigate('PostDetail', { postId: parseInt(postMatch[1]) });
        return true;
      }

      // Activity: /activities/{id}
      const activityMatch = url.match(/^\/activities\/(\d+)$/);
      if (activityMatch) {
        navigation.navigate('ActivityDetail', { activityId: parseInt(activityMatch[1]) });
        return true;
      }

      // Event: /events/{id}
      const eventMatch = url.match(/^\/events\/(\d+)$/);
      if (eventMatch) {
        navigation.navigate('EventDetail', { eventId: parseInt(eventMatch[1]) });
        return true;
      }

      // Messages: /messages?conversation={id}
      // Note: We navigate to ConversationsList because Chat screen requires participant data
      if (url.startsWith('/messages')) {
        navigation.navigate('ConversationsList');
        return true;
      }

      logger.warn('general', 'Unknown URL pattern', { url });
      return false;
    } catch (error) {
      logger.error('general', 'Error parsing notification URL', { url, error });
      return false;
    }
  };

  // Set up notification listeners
  useEffect(() => {
    // Listener for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        logger.debug('general', 'Notification received in foreground', {
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data,
        });
        // Notification will be displayed automatically due to notification handler config
      }
    );

    // Listener for when user taps on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as unknown as PushNotificationData;
        logger.info('general', 'Notification tapped', { data });
        handleNotificationNavigation(data);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [handleNotificationNavigation]);

  // Handle cold start (app opened from notification when not running)
  useEffect(() => {
    const handleColdStart = async () => {
      // Get the notification that opened the app (if any)
      const response = await Notifications.getLastNotificationResponseAsync();

      if (response) {
        const data = response.notification.request.content.data as unknown as PushNotificationData;
        logger.info('general', 'Cold start from notification', { data });

        // Wait for navigation to be ready
        if (navigationRef?.current?.isReady()) {
          handleNotificationNavigation(data);
        } else {
          // If navigation isn't ready yet, wait a bit and retry
          const checkNavigation = setInterval(() => {
            if (navigationRef?.current?.isReady()) {
              clearInterval(checkNavigation);
              handleNotificationNavigation(data);
            }
          }, 100);

          // Give up after 5 seconds
          setTimeout(() => clearInterval(checkNavigation), 5000);
        }
      }
    };

    handleColdStart();
  }, [navigationRef, handleNotificationNavigation]);

  return {
    hasPermission,
    isRegistered,
    expoPushToken,
    requestPermission,
  };
}
