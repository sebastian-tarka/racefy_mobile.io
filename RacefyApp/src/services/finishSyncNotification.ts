/**
 * "Your activity made it" — a local notification for a queued finish that was
 * delivered later, in the background of whatever the athlete is doing now.
 * A finish delivered while they are still looking at the save screen is
 * announced there instead, and never reaches this module.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import i18n from 'i18next';
import { logger } from './logger';

const CHANNEL_ID = 'activity-sync';
let channelReady = false;

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Activity sync',
    description: 'Confirms that an activity saved offline has been uploaded',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#10b981',
  });
  channelReady = true;
}

export async function notifyActivityDelivered(info: {
  title?: string;
  pointsEarned?: number;
}): Promise<void> {
  try {
    await ensureChannel();
    const body =
      info.pointsEarned && info.pointsEarned > 0
        ? i18n.t('unsynced.deliveredBodyPoints', {
            title: info.title ?? '',
            points: info.pointsEarned,
          })
        : i18n.t('unsynced.deliveredBody', { title: info.title ?? '' });
    await Notifications.scheduleNotificationAsync({
      content: { title: i18n.t('unsynced.deliveredTitle'), body: body.trim() },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
    });
  } catch (err) {
    // No permission, no module (web): the queue screen and the feed still show it.
    logger.debug('activity', 'Could not show delivered notification', { error: err });
  }
}
