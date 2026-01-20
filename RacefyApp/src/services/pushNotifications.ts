import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';
import { logger } from './logger';
import type { DeviceType } from '../types/api';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class PushNotificationService {
  private expoPushToken: string | null = null;
  private isRegistered = false;

  /**
   * Initialize push notifications
   * - Creates Android notification channel
   * - Requests permissions
   * - Gets Expo push token
   */
  async initialize(): Promise<string | null> {
    logger.info('general', 'Initializing push notifications');

    // Create Android notification channel
    if (Platform.OS === 'android') {
      await this.createAndroidChannel();
    }

    // Check if running on a physical device (required for push notifications)
    if (!Device.isDevice) {
      logger.warn('general', 'Push notifications require a physical device');
      return null;
    }

    // Request permissions
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      logger.warn('general', 'Push notification permission denied');
      return null;
    }

    // Get Expo push token
    try {
      const token = await this.getExpoPushToken();
      this.expoPushToken = token;
      logger.info('general', 'Got Expo push token', { token: token?.substring(0, 20) + '...' });
      return token;
    } catch (error) {
      logger.error('general', 'Failed to get Expo push token', { error });
      return null;
    }
  }

  /**
   * Create Android notification channel
   * Required for Android 8.0+ to display notifications
   */
  private async createAndroidChannel(): Promise<void> {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      description: 'Default notification channel for Racefy',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10b981', // Emerald color
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
    });

    // Create a separate channel for messages
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      description: 'Direct messages from other users',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10b981',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    // Create a channel for activity updates
    await Notifications.setNotificationChannelAsync('activities', {
      name: 'Activities',
      description: 'Activity likes, comments, and boosts',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#10b981',
      sound: 'default',
      showBadge: true,
    });

    // Create a channel for events
    await Notifications.setNotificationChannelAsync('events', {
      name: 'Events',
      description: 'Event reminders and updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10b981',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    logger.debug('general', 'Android notification channels created');
  }

  /**
   * Request notification permissions
   * @returns true if permission granted, false otherwise
   */
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    logger.debug('general', 'Notification permission status', { status: finalStatus });
    return finalStatus === 'granted';
  }

  /**
   * Get the current permission status
   */
  async getPermissionStatus(): Promise<Notifications.PermissionStatus> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  /**
   * Get Expo push token
   * This token is sent to the backend for FCM/APNs delivery
   */
  private async getExpoPushToken(): Promise<string | null> {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      logger.error('general', 'EAS project ID not found in app config');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return token.data;
  }

  /**
   * Register device with backend
   * Should be called after user logs in
   */
  async registerWithBackend(): Promise<boolean> {
    if (!this.expoPushToken) {
      // Try to get token if not already available
      const token = await this.initialize();
      if (!token) {
        logger.debug('general', 'No push token available for registration');
        return false;
      }
    }

    if (this.isRegistered) {
      logger.debug('general', 'Device already registered for push notifications');
      return true;
    }

    try {
      const deviceType: DeviceType = Platform.OS === 'ios' ? 'ios' : 'android';

      const response = await api.registerDevice(this.expoPushToken!, deviceType);
      this.isRegistered = true;

      logger.info('general', 'Device registered for push notifications', {
        deviceId: response.device_id,
        deviceType,
      });

      return true;
    } catch (error) {
      logger.error('general', 'Failed to register device for push notifications', { error });
      return false;
    }
  }

  /**
   * Unregister device from backend
   * Should be called before user logs out
   */
  async unregisterFromBackend(): Promise<boolean> {
    if (!this.isRegistered) {
      logger.debug('general', 'Device not registered, skipping unregister');
      return true;
    }

    try {
      await api.unregisterDevice();
      this.isRegistered = false;

      logger.info('general', 'Device unregistered from push notifications');
      return true;
    } catch (error) {
      logger.error('general', 'Failed to unregister device from push notifications', { error });
      // Reset state even on error to allow re-registration on next login
      this.isRegistered = false;
      return false;
    }
  }

  /**
   * Get the current Expo push token
   */
  getToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Check if device is registered with backend
   */
  isDeviceRegistered(): boolean {
    return this.isRegistered;
  }

  /**
   * Reset service state (for testing or logout)
   */
  reset(): void {
    this.expoPushToken = null;
    this.isRegistered = false;
  }

  /**
   * Get the badge count
   */
  async getBadgeCount(): Promise<number> {
    return Notifications.getBadgeCountAsync();
  }

  /**
   * Set the badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear all badge counts
   */
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Dismiss all notifications
   */
  async dismissAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }
}

export const pushNotificationService = new PushNotificationService();
