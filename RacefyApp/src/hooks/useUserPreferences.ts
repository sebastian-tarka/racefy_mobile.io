import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { changeLanguage } from '../i18n';
import type { NotificationChannelSettings, UserPreferences } from '../types/api';
import { triggerHaptic } from './useHaptics';
import { useTheme } from './useTheme';

const DEFAULT_CHANNEL_SETTINGS: NotificationChannelSettings = {
  email: true,
  push: true,
  websocket: true,
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  units: 'metric',
  language: 'en',
  theme: 'system',
  map_style: null,
  notifications: {
    likes: { ...DEFAULT_CHANNEL_SETTINGS },
    comments: { ...DEFAULT_CHANNEL_SETTINGS },
    follows: { ...DEFAULT_CHANNEL_SETTINGS },
    messages: { ...DEFAULT_CHANNEL_SETTINGS },
    event_reminders: { ...DEFAULT_CHANNEL_SETTINGS },
    weekly_summary: { ...DEFAULT_CHANNEL_SETTINGS },
    activity_reactions: { ...DEFAULT_CHANNEL_SETTINGS },
    mentions: { ...DEFAULT_CHANNEL_SETTINGS },
    training_week_feedback: { ...DEFAULT_CHANNEL_SETTINGS },
    // Neither sends email — both are about something happening now, and mail
    // arrives once it is over.
    activity_started: { email: false, push: true, websocket: true },
    activity_live_started: { email: false, push: true, websocket: true },
  },
  privacy: {
    profile_visibility: 'public',
    show_activities: true,
    show_stats: true,
    allow_messages: 'everyone',
    share_achievements: true,
    show_start_finish_points: true,
  },
  activity_defaults: {
    visibility: 'public',
    auto_share: true,
    favorite_sport_id: null,
  },
  ai_posts: {
    enabled: false,
    default_style: 'achievement',
    default_perspective: 'descriptive',
    triggers: {
      activity_completion: true,
      activity_share: false,
      event_results: true,
    },
    auto_publish: false,
  },
};

type NestedCategory = 'notifications' | 'privacy' | 'activity_defaults';

/**
 * The user's server-side preferences for the settings screen.
 *
 * Every update is optimistic: the switch moves at once, the PATCH goes out
 * with dot-notation keys, the server's answer replaces the state, and a
 * failure puts back what was there before the tap and says so. Loading also
 * brings the local theme and language in line with the server.
 */
export function useUserPreferences() {
  const { t } = useTranslation();
  const { themePreference, setThemePreference } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingAiPosts, setIsUpdatingAiPosts] = useState(false);
  /** What a failed update rolls back to — the state at the moment of the tap. */
  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;

  useEffect(() => {
    const load = async () => {
      try {
        const prefs = await api.getPreferences();
        setPreferences(prefs);
        // Sync local theme with server preferences
        if (prefs.theme && prefs.theme !== themePreference) {
          setThemePreference(prefs.theme);
        }
        // Sync local language with server preferences
        if (prefs.language) {
          await changeLanguage(prefs.language);
        }
      } catch (error) {
        logger.error('api', 'Failed to load preferences', { error });
      } finally {
        setIsLoading(false);
      }
    };
    void load();
    // Once per screen; the theme read is only the starting point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Optimistic patch → PATCH → server state, or roll back with `failedKey`'s message. */
  const apply = useCallback(
    async (
      optimistic: (prev: UserPreferences) => UserPreferences,
      body: Record<string, unknown>,
      logMessage: string,
      failedKey = 'settings.updateFailed',
    ) => {
      const before = prefsRef.current;
      setPreferences(optimistic);
      try {
        // Sync with server response
        setPreferences(await api.updatePreferences(body));
      } catch (error) {
        logger.error('api', logMessage, { error });
        setPreferences(before);
        Alert.alert(t('common.error'), t(failedKey));
      }
    },
    [t],
  );

  const updatePreference = useCallback(
    async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      triggerHaptic();
      await apply(
        (prev) => ({ ...prev, [key]: value }),
        { [key]: value },
        'Failed to update preferences',
      );
    },
    [apply],
  );

  const updateNestedPreference = useCallback(
    async <K extends NestedCategory, NK extends keyof UserPreferences[K]>(
      category: K,
      key: NK,
      value: UserPreferences[K][NK],
    ) => {
      triggerHaptic();
      await apply(
        (prev) => ({ ...prev, [category]: { ...prev[category], [key]: value } }),
        // Use dot notation for partial update
        { [`${category}.${String(key)}`]: value },
        'Failed to update nested preferences',
      );
    },
    [apply],
  );

  /** One channel (email/push) of one notification type. */
  const updateNotificationChannel = useCallback(
    async (
      notificationType: keyof UserPreferences['notifications'],
      channel: 'email' | 'push',
      value: boolean,
    ) => {
      await apply(
        (prev) => ({
          ...prev,
          notifications: {
            ...prev.notifications,
            [notificationType]: { ...prev.notifications[notificationType], [channel]: value },
          },
        }),
        { [`notifications.${notificationType}.${channel}`]: value },
        'Failed to update notification preference',
      );
    },
    [apply],
  );

  /**
   * Silence or unsilence a whole "happening now" category.
   *
   * Push and websocket are written in the same request so the two can never
   * drift apart — a category that is off for push but still arriving over the
   * socket is the bug this prevents.
   */
  const updateLiveNotification = useCallback(
    async (notificationType: 'activity_started' | 'activity_live_started', value: boolean) => {
      await apply(
        (prev) => ({
          ...prev,
          notifications: {
            ...prev.notifications,
            [notificationType]: {
              ...prev.notifications[notificationType],
              push: value,
              websocket: value,
            },
          },
        }),
        {
          [`notifications.${notificationType}.push`]: value,
          [`notifications.${notificationType}.websocket`]: value,
        },
        'Failed to update live notification preference',
      );
    },
    [apply],
  );

  /** AI posts preference by dot path ('ai_posts.enabled', 'ai_posts.triggers.activity_completion'). */
  const updateAiPostsPreference = useCallback(
    async (key: string, value: any) => {
      setIsUpdatingAiPosts(true);
      const keys = key.split('.');
      try {
        await apply(
          (prev) => {
            if (keys.length === 2) {
              return { ...prev, ai_posts: { ...prev.ai_posts, [keys[1]]: value } };
            }
            if (keys.length === 3) {
              return {
                ...prev,
                ai_posts: {
                  ...prev.ai_posts,
                  [keys[1]]: {
                    ...(prev.ai_posts[keys[1] as keyof typeof prev.ai_posts] as any),
                    [keys[2]]: value,
                  },
                },
              };
            }
            return prev;
          },
          { [key]: value },
          'Failed to update AI posts preference',
          'settings.aiPostsFailed',
        );
      } finally {
        setIsUpdatingAiPosts(false);
      }
    },
    [apply],
  );

  return {
    preferences,
    isLoading,
    isUpdatingAiPosts,
    updatePreference,
    updateNestedPreference,
    updateNotificationChannel,
    updateLiveNotification,
    updateAiPostsPreference,
  };
}
