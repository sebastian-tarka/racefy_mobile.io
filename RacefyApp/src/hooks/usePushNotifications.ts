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

      const { type } = data;
      logger.info('general', 'Handling notification navigation', { type, data });

      switch (type as NotificationType) {
        case 'likes':
        case 'comments':
        case 'mentions':
          // Navigate to the liked/commented item
          if (data.post_id) {
            navigation.navigate('PostDetail', {
              postId: data.post_id,
              focusComments: type === 'comments' || type === 'mentions',
            });
          } else if (data.activity_id) {
            navigation.navigate('ActivityDetail', {
              activityId: data.activity_id,
            });
          }
          break;

        case 'follows':
          // Navigate to the follower's profile
          if (data.actor_username) {
            navigation.navigate('UserProfile', {
              username: data.actor_username,
            });
          }
          break;

        case 'messages':
          // Navigate to the conversation
          if (data.conversation_id) {
            // We need to navigate to ConversationsList first, then to Chat
            // Or we could navigate directly to Chat if we have participant data
            navigation.navigate('ConversationsList');
          }
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

        case 'boosts':
        case 'activity_reactions':
          // Navigate to the activity
          if (data.activity_id) {
            navigation.navigate('ActivityDetail', {
              activityId: data.activity_id,
            });
          }
          break;

        default:
          logger.warn('general', 'Unhandled notification type', { type });
          // Navigate to notifications list as fallback
          navigation.navigate('Notifications');
      }
    },
    [navigationRef]
  );

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
