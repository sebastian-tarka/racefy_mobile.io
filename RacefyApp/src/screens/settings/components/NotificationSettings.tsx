import React from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { UserPreferences } from '../../../types/api';
import { LiveNotificationRow, NotificationRow } from './SettingsRows';

type Notifications = UserPreferences['notifications'];
type LiveType = 'activity_started' | 'activity_live_started';
type ChannelType = Exclude<keyof Notifications, LiveType>;
type Icon = keyof typeof Ionicons.glyphMap;

/** "Happening now" categories: one switch, push and websocket together. */
const LIVE_ROWS: [LiveType, Icon][] = [
  ['activity_live_started', 'radio-outline'],
  ['activity_started', 'play-circle-outline'],
];

/** Everything else: separate email and push switches. */
const CHANNEL_ROWS: [ChannelType, Icon][] = [
  ['likes', 'heart-outline'],
  ['comments', 'chatbubble-outline'],
  ['follows', 'person-add-outline'],
  ['messages', 'chatbubbles-outline'],
  ['event_reminders', 'calendar-outline'],
  ['weekly_summary', 'stats-chart-outline'],
  ['activity_reactions', 'thumbs-up-outline'],
  ['mentions', 'at-outline'],
  ['training_week_feedback', 'bar-chart-outline'],
];

interface Props {
  notifications: Notifications;
  onLiveChange: (type: LiveType, value: boolean) => void;
  onChannelChange: (type: keyof Notifications, channel: 'email' | 'push', value: boolean) => void;
}

/** The rows of the Notifications section, in the order the screen always had. */
export function NotificationSettings({ notifications, onLiveChange, onChannelChange }: Props) {
  const { t } = useTranslation();

  return (
    <>
      {LIVE_ROWS.map(([type, icon]) => (
        <LiveNotificationRow
          key={type}
          type={type}
          icon={icon}
          label={t(`settings.notif_${type}`)}
          description={t(`settings.notif_${type}_desc`)}
          settings={notifications[type]}
          onChange={onLiveChange}
        />
      ))}
      {CHANNEL_ROWS.map(([type, icon]) => (
        <NotificationRow
          key={type}
          type={type}
          icon={icon}
          label={t(`settings.notif_${type}`)}
          description={t(`settings.notif_${type}_desc`)}
          settings={notifications[type]}
          onChange={onChannelChange}
        />
      ))}
    </>
  );
}
