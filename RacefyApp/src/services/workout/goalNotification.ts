/**
 * Safety net for TIME goals while the app is suspended.
 *
 * Distance goals are evaluated by the background location task on every GPS
 * fix. A time goal has no such trigger: with the phone locked and the athlete
 * standing still, nothing wakes our JavaScript. A local notification scheduled
 * for the goal moment fires regardless — with the system sound, which is a
 * cue, not silence.
 *
 * It is scheduled a couple of seconds AFTER the goal so that a live foreground
 * (which announces the goal itself within one 100 ms tick) always has time to
 * cancel it first; only a suspended app lets it through.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { logger } from '../logger';
import { loadGoalNotificationId, saveGoalNotificationId } from './storage';

const CHANNEL_ID = 'workout';
/** Grace period so the foreground wins the race. */
export const GOAL_NOTIFICATION_GRACE_S = 2;

let channelReady = false;

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Workout cues',
      description: 'Goal reached and interval changes while the app is in the background',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#10b981',
      sound: 'default',
      enableVibrate: true,
    });
    channelReady = true;
  } catch (err) {
    logger.warn('audioCoach', 'Failed to create workout notification channel', { error: err });
  }
}

export interface GoalNotificationContent {
  title: string;
  body: string;
}

/**
 * (Re)schedule the goal notification `secondsFromNow` seconds ahead. Any
 * previously scheduled one is cancelled first — there is only ever one.
 */
export async function scheduleGoalNotification(
  secondsFromNow: number,
  content: GoalNotificationContent,
): Promise<void> {
  await cancelGoalNotification();
  if (!(secondsFromNow > 0)) return;

  try {
    await ensureChannel();
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: content.title, body: content.body, sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: Date.now() + (secondsFromNow + GOAL_NOTIFICATION_GRACE_S) * 1000,
        channelId: CHANNEL_ID,
      },
    });
    await saveGoalNotificationId(id);
    logger.debug('audioCoach', 'Goal notification scheduled', { id, secondsFromNow });
  } catch (err) {
    // No permission / emulator: the foreground and GPS-driven cues still work.
    logger.warn('audioCoach', 'Failed to schedule goal notification', { error: err });
  }
}

export async function cancelGoalNotification(): Promise<void> {
  const id = await loadGoalNotificationId();
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or never existed.
  }
  await saveGoalNotificationId(null);
}
