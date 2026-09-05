/**
 * Rest-timer safety net: a local notification for the moment the rest ends,
 * so a locked phone still buzzes. Cancelled whenever the foreground timer
 * finishes first, the athlete skips the rest, or the session ends.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { logger } from '../logger';

const CHANNEL_ID = 'workout';
let channelReady = false;
let scheduledId: string | null = null;

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Workout cues',
      description: 'Rest timer and workout cues',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#10b981',
      sound: 'default',
      enableVibrate: true,
    });
    channelReady = true;
  } catch (err) {
    logger.warn('general', 'Failed to create workout notification channel', { error: err });
  }
}

export async function scheduleRestEndNotification(
  secondsFromNow: number,
  content: { title: string; body: string },
): Promise<void> {
  await cancelRestEndNotification();
  if (!(secondsFromNow > 0)) return;
  try {
    await ensureChannel();
    scheduledId = await Notifications.scheduleNotificationAsync({
      content: { title: content.title, body: content.body, sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: Date.now() + secondsFromNow * 1000,
        channelId: CHANNEL_ID,
      },
    });
  } catch (err) {
    logger.warn('general', 'Failed to schedule rest notification', { error: err });
  }
}

export async function cancelRestEndNotification(): Promise<void> {
  if (!scheduledId) return;
  const id = scheduledId;
  scheduledId = null;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // already fired
  }
}
