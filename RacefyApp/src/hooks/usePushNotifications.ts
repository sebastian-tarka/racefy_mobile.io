import { useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { type EventSubscription } from 'expo-modules-core';
import { NavigationContainerRefWithCurrent, ParamListBase } from '@react-navigation/native';
import { pushNotificationService } from '../services/pushNotifications';
import { logger } from '../services/logger';
import type { PushNotificationData } from '../types/api';
import { resolveNotificationTarget } from '../utils/notificationRouting';

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
  options: UsePushNotificationsOptions = {},
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

      if (!type) {
        logger.warn('general', 'Notification has no type, skipping navigation', { data });
        return;
      }

      logger.info('general', 'Handling notification navigation', { type, url, data });

      // Where a notification leads is decided in one place, shared with the
      // in-app notifications list — see resolveNotificationTarget for why.
      const target = resolveNotificationTarget({ type, url, data });
      if (!target) {
        logger.warn('general', 'No route for notification', { type, url, data });
        return;
      }

      navigation.navigate(target.screen, 'params' in target ? target.params : undefined);
    },
    [navigationRef],
  );

  // Stable ref to the latest handleNotificationNavigation — avoids recreating listeners
  // when the callback identity changes (e.g. after auth state update)
  const handleNotificationNavigationRef = useRef(handleNotificationNavigation);
  useEffect(() => {
    handleNotificationNavigationRef.current = handleNotificationNavigation;
  }, [handleNotificationNavigation]);

  // Navigate when navigation is ready — with retry if not ready yet
  const navigateWhenReady = useCallback(
    (data: PushNotificationData) => {
      if (navigationRef?.current?.isReady()) {
        handleNotificationNavigationRef.current(data);
        return;
      }

      const interval = setInterval(() => {
        if (navigationRef?.current?.isReady()) {
          clearInterval(interval);
          handleNotificationNavigationRef.current(data);
        }
      }, 100);

      // Give up after 5 seconds
      setTimeout(() => clearInterval(interval), 5000);
    },
    [navigationRef],
  );

  // Set up notification listeners — stable, never recreated
  useEffect(() => {
    // Listener for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      logger.debug('general', 'Notification received in foreground', {
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
      });
      // Notification will be displayed automatically due to notification handler config
    });

    // Listener for when user taps on a notification (app in foreground or background)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as unknown as PushNotificationData;
      logger.info('general', 'Notification tapped', { data });
      navigateWhenReady(data);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [navigateWhenReady]);

  // Handle cold start (app opened from notification when fully killed)
  // useRef guards against running twice if navigateWhenReady identity changes
  const coldStartHandled = useRef(false);
  useEffect(() => {
    if (coldStartHandled.current) return;

    const handleColdStart = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (!response) return;

      coldStartHandled.current = true;
      const data = response.notification.request.content.data as unknown as PushNotificationData;
      logger.info('general', 'Cold start from notification', { data });
      navigateWhenReady(data);
    };

    handleColdStart();
  }, [navigateWhenReady]);

  return {
    hasPermission,
    isRegistered,
    expoPushToken,
    requestPermission,
  };
}
