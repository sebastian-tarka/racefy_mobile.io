import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Input, Button, ScreenHeader, PrivacyConsentsSection, AiPostsSettings, DebugLogsSection, SettingsSection, BrandLogo, ScreenContainer } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics, triggerHaptic } from '../../hooks/useHaptics';
import { useSportTypes, type SportTypeWithIcon } from '../../hooks/useSportTypes';
import { useHealthSync } from '../../hooks/useHealthSync';
import { useUnits } from '../../hooks/useUnits';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { changeLanguage } from '../../i18n';
import { spacing, fontSize } from '../../theme';

const SETTINGS_SECTIONS_KEY = '@racefy_settings_sections';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { UserPreferences, NotificationChannelSettings } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SettingsRow({ icon, label, value, onPress, rightElement, danger }: SettingsRowProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    triggerHaptic();
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={handlePress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.rowLeft}>
        <Ionicons
          name={icon}
          size={22}
          color={danger ? colors.error : colors.textSecondary}
          style={styles.rowIcon}
        />
        <Text style={[styles.rowLabel, { color: colors.textPrimary }, danger && { color: colors.error }]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value && <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{value}</Text>}
        {rightElement}
        {onPress && !rightElement && (
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// Notification row with email and push toggles
interface NotificationRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  settings: NotificationChannelSettings;
  onEmailChange: (value: boolean) => void;
  onPushChange: (value: boolean) => void;
}

function NotificationRow({ icon, label, description, settings, onEmailChange, onPushChange }: NotificationRowProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.notificationRow, { borderBottomColor: colors.border }]}>
      <View style={styles.notificationHeader}>
        <Ionicons name={icon} size={20} color={colors.textSecondary} style={styles.notificationIcon} />
        <View style={styles.notificationLabelContainer}>
          <Text style={[styles.notificationLabel, { color: colors.textPrimary }]}>{label}</Text>
          {description && <Text style={[styles.notificationDescription, { color: colors.textSecondary }]}>{description}</Text>}
        </View>
      </View>
      <View style={styles.notificationToggles}>
        <View style={styles.toggleItem}>
          <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Email</Text>
          <Switch
            value={settings.email}
            onValueChange={(value) => {
              triggerHaptic();
              onEmailChange(value);
            }}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={settings.email ? colors.primary : colors.white}
          />
        </View>
        <View style={styles.toggleItem}>
          <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Push</Text>
          <Switch
            value={settings.push}
            onValueChange={(value) => {
              triggerHaptic();
              onPushChange(value);
            }}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={settings.push ? colors.primary : colors.white}
          />
        </View>
      </View>
    </View>
  );
}

const DEFAULT_CHANNEL_SETTINGS: NotificationChannelSettings = {
  email: true,
  push: true,
  websocket: true,
};

const DEFAULT_PREFERENCES: UserPreferences = {
  units: 'metric',
  language: 'en',
  theme: 'system',
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
  },
  privacy: {
    profile_visibility: 'public',
    show_activities: true,
    show_stats: true,
    allow_messages: 'everyone',
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

export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { colors, isDark, themePreference, setThemePreference } = useTheme();
  const { isEnabled: hapticsEnabled, setEnabled: setHapticsEnabled } = useHaptics();
  const { setUnits } = useUnits();

  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingAiPosts, setIsUpdatingAiPosts] = useState(false);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // Delete account state
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Health sync
  const {
    isEnabled: healthSyncEnabled,
    status: healthStatus,
    toggle: toggleHealthSync,
    requestPermission: requestHealthPermission,
    hasPermission: hasHealthPermission,
    isLoading: healthSyncLoading,
  } = useHealthSync();

  // Sport types and favorite sport modal
  const { sportTypes, isLoading: sportsLoading } = useSportTypes();
  const [showSportModal, setShowSportModal] = useState(false);

  // Section collapse state - account and app open by default
  const [expandedSections, setExpandedSections] = useState({
    account: true,
    adminTools: false,
    consents: false,
    preferences: false,
    notifications: false,
    privacy: false,
    privacySafety: false,
    activityDefaults: false,
    healthSync: false,
    aiPosts: false,
    app: true,
    dangerZone: false,
  });

  // Load saved section states from storage
  useEffect(() => {
    const loadSectionStates = async () => {
      try {
        const saved = await AsyncStorage.getItem(SETTINGS_SECTIONS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setExpandedSections(prev => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        logger.debug('general', 'Failed to load section states', { error });
      }
    };
    loadSectionStates();
  }, []);

  const toggleSection = useCallback(async (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => {
      const newState = { ...prev, [section]: !prev[section] };
      // Save to storage (async, don't await)
      AsyncStorage.setItem(SETTINGS_SECTIONS_KEY, JSON.stringify(newState)).catch(err => {
        logger.debug('general', 'Failed to save section states', { error: err });
      });
      return newState;
    });
  }, []);

  const appVersion = Application.nativeApplicationVersion || '1.0.0';

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
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

  const updatePreference = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    triggerHaptic();
    const oldPreferences = { ...preferences };
    setPreferences(prev => ({ ...prev, [key]: value }));

    try {
      const updatedPrefs = await api.updatePreferences({ [key]: value });
      // Sync with server response
      setPreferences(updatedPrefs);
    } catch (error) {
      logger.error('api', 'Failed to update preferences', { error });
      setPreferences(oldPreferences);
      Alert.alert(t('common.error'), t('settings.updateFailed'));
    }
  };

  const updateNestedPreference = async <
    K extends 'notifications' | 'privacy' | 'activity_defaults',
    NK extends keyof UserPreferences[K]
  >(
    category: K,
    key: NK,
    value: UserPreferences[K][NK]
  ) => {
    triggerHaptic();
    const oldPreferences = { ...preferences };
    const updatedCategory = { ...preferences[category], [key]: value };
    setPreferences(prev => ({ ...prev, [category]: updatedCategory }));

    try {
      // Use dot notation for partial update
      const updatedPrefs = await api.updatePreferences({
        [`${category}.${String(key)}`]: value,
      });
      // Sync with server response
      setPreferences(updatedPrefs);
    } catch (error) {
      logger.error('api', 'Failed to update nested preferences', { error });
      setPreferences(oldPreferences);
      Alert.alert(t('common.error'), t('settings.updateFailed'));
    }
  };

  // Update a specific notification channel (email/push) for a notification type
  const updateNotificationChannel = async (
    notificationType: keyof UserPreferences['notifications'],
    channel: 'email' | 'push',
    value: boolean
  ) => {
    const oldPreferences = { ...preferences };
    const updatedNotificationType = {
      ...preferences.notifications[notificationType],
      [channel]: value,
    };
    const updatedNotifications = {
      ...preferences.notifications,
      [notificationType]: updatedNotificationType,
    };
    setPreferences(prev => ({ ...prev, notifications: updatedNotifications }));

    try {
      // Use dot notation for partial update as supported by API
      const updatedPrefs = await api.updatePreferences({
        [`notifications.${notificationType}.${channel}`]: value,
      });
      // Sync with server response
      setPreferences(updatedPrefs);
    } catch (error) {
      logger.error('api', 'Failed to update notification preference', { error });
      setPreferences(oldPreferences);
      Alert.alert(t('common.error'), t('settings.updateFailed'));
    }
  };

  // Update AI posts preference using dot notation (e.g., 'ai_posts.enabled')
  const updateAiPostsPreference = async (key: string, value: any) => {
    setIsUpdatingAiPosts(true);
    const oldPreferences = { ...preferences };

    // Optimistically update local state
    const keys = key.split('.');
    if (keys.length === 2) {
      // Simple key like 'ai_posts.enabled'
      setPreferences(prev => ({
        ...prev,
        ai_posts: {
          ...prev.ai_posts,
          [keys[1]]: value,
        },
      }));
    } else if (keys.length === 3) {
      // Nested key like 'ai_posts.triggers.activity_completion'
      setPreferences(prev => ({
        ...prev,
        ai_posts: {
          ...prev.ai_posts,
          [keys[1]]: {
            ...(prev.ai_posts[keys[1] as keyof typeof prev.ai_posts] as any),
            [keys[2]]: value,
          },
        },
      }));
    }

    try {
      const updatedPrefs = await api.updatePreferences({
        [key]: value,
      });
      // Sync with server response
      setPreferences(updatedPrefs);
    } catch (error) {
      logger.error('api', 'Failed to update AI posts preference', { error });
      setPreferences(oldPreferences);
      Alert.alert(t('common.error'), t('settings.aiPostsFailed'));
    } finally {
      setIsUpdatingAiPosts(false);
    }
  };

  const handlePasswordChange = async () => {
    const errors: Record<string, string> = {};

    if (!currentPassword) {
      errors.currentPassword = t('settings.currentPasswordRequired');
    }
    if (!newPassword) {
      errors.newPassword = t('settings.newPasswordRequired');
    } else if (newPassword.length < 8) {
      errors.newPassword = t('auth.validation.passwordMinLength');
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = t('auth.validation.passwordsNotMatch');
    }

    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsChangingPassword(true);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await api.updatePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('common.success'), t('settings.passwordChanged'));
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error?.errors?.current_password) {
        setPasswordErrors({ currentPassword: t('settings.incorrectPassword') });
      } else {
        Alert.alert(t('common.error'), t('settings.passwordChangeFailed'));
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert(t('common.error'), t('settings.passwordRequiredForDelete'));
      return;
    }

    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);

            try {
              await api.deleteAccount(deletePassword);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await logout();
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              if (error?.message?.includes('password')) {
                Alert.alert(t('common.error'), t('settings.incorrectPassword'));
              } else {
                Alert.alert(t('common.error'), t('settings.deleteAccountFailed'));
              }
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t('common.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.navigate('Auth', { screen: 'Login' });
        },
      },
    ]);
  };

  const getVisibilityLabel = (value: 'public' | 'followers' | 'private') => {
    const labels = {
      public: t('settings.public'),
      followers: t('settings.followersOnly'),
      private: t('settings.private'),
    };
    return labels[value];
  };

  const getMessagesLabel = (value: 'everyone' | 'followers' | 'none') => {
    const labels = {
      everyone: t('settings.everyone'),
      followers: t('settings.followersOnly'),
      none: t('settings.noOne'),
    };
    return labels[value];
  };

  const cycleVisibility = (current: 'public' | 'followers' | 'private') => {
    const order: ('public' | 'followers' | 'private')[] = ['public', 'followers', 'private'];
    const currentIndex = order.indexOf(current);
    return order[(currentIndex + 1) % order.length];
  };

  const cycleMessages = (current: 'everyone' | 'followers' | 'none') => {
    const order: ('everyone' | 'followers' | 'none')[] = ['everyone', 'followers', 'none'];
    const currentIndex = order.indexOf(current);
    return order[(currentIndex + 1) % order.length];
  };

  const getFavoriteSportLabel = () => {
    const sportId = preferences.activity_defaults.favorite_sport_id;
    if (!sportId) return t('settings.noSportSelected');
    const sport = sportTypes.find(s => s.id === sportId);
    return sport?.name || t('settings.noSportSelected');
  };

  const handleSelectFavoriteSport = async (sport: SportTypeWithIcon | null) => {
    try {
      await updateNestedPreference('activity_defaults', 'favorite_sport_id', sport?.id || null);
      setShowSportModal(false);
      triggerHaptic();
    } catch (error) {
      logger.error('general', 'Failed to update favorite sport', { error });
    }
  };

  logger.debug('auth', 'Current user role', { role: user?.role });

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('settings.title')}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Account Section */}
        <SettingsSection
          title={t('settings.account')}
          isExpanded={expandedSections.account}
          onToggle={() => toggleSection('account')}
        >
          <SettingsRow
            icon="person-outline"
            label={t('settings.editProfile')}
            onPress={() => navigation.navigate('EditProfile')}
          />
          <SettingsRow
            icon="lock-closed-outline"
            label={t('settings.changePassword')}
            onPress={() => {
              setShowPasswordChange(!showPasswordChange);
              setPasswordErrors({});
            }}
          />
          {/* Password Change Form */}
          {showPasswordChange && (
            <View style={[styles.formSection, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
              <Input
                label={t('settings.currentPassword')}
                placeholder={t('settings.currentPasswordPlaceholder')}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                error={passwordErrors.currentPassword}
              />
              <Input
                label={t('settings.newPassword')}
                placeholder={t('settings.newPasswordPlaceholder')}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                error={passwordErrors.newPassword}
              />
              <Input
                label={t('auth.confirmPassword')}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                error={passwordErrors.confirmPassword}
              />
              <Button
                title={t('settings.updatePassword')}
                onPress={handlePasswordChange}
                loading={isChangingPassword}
                style={styles.formButton}
              />
            </View>
          )}
        </SettingsSection>

        {/* Admin Tools (only visible to admins) */}
        {user?.role === 'admin' && (
          <SettingsSection
            title={t('settings.adminTools.title')}
            isExpanded={expandedSections.adminTools}
            onToggle={() => toggleSection('adminTools')}
          >
            <SettingsRow
              icon="person-circle-outline"
              label={t('settings.adminTools.impersonate')}
              onPress={() => navigation.navigate('ImpersonateUser')}
            />
          </SettingsSection>
        )}

        {/* Legal Consents */}
        <SettingsSection
          title={t('legal.consentsTitle')}
          isExpanded={expandedSections.consents}
          onToggle={() => toggleSection('consents')}
        >
          <PrivacyConsentsSection embedded />
        </SettingsSection>

        {/* General Preferences */}
        <SettingsSection
          title={t('settings.preferences')}
          isExpanded={expandedSections.preferences}
          onToggle={() => toggleSection('preferences')}
        >
          <SettingsRow
            icon="speedometer-outline"
            label={t('settings.units')}
            value={preferences.units === 'metric' ? t('settings.metric') : t('settings.imperial')}
            rightElement={
              <Switch
                value={preferences.units === 'imperial'}
                onValueChange={(value) => {
                  const newUnits = value ? 'imperial' : 'metric';
                  setUnits(newUnits);
                  updatePreference('units', newUnits);
                }}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={preferences.units === 'imperial' ? colors.primary : colors.white}
                disabled={isLoading}
              />
            }
          />
          <SettingsRow
            icon="language-outline"
            label={t('settings.language')}
            value={preferences.language === 'en' ? 'English' : 'Polski'}
            onPress={async () => {
              const newLang = preferences.language === 'en' ? 'pl' : 'en';
              await changeLanguage(newLang);
              updatePreference('language', newLang);
            }}
          />
          <SettingsRow
            icon="color-palette-outline"
            label={t('settings.theme')}
            value={t(`settings.theme_${themePreference}`)}
            onPress={async () => {
              const themes: ('light' | 'dark' | 'system')[] = ['system', 'light', 'dark'];
              const currentIndex = themes.indexOf(themePreference);
              const newTheme = themes[(currentIndex + 1) % themes.length];
              await setThemePreference(newTheme);
              updatePreference('theme', newTheme);
            }}
          />
          <SettingsRow
            icon="phone-portrait-outline"
            label={t('settings.hapticFeedback')}
            rightElement={
              <Switch
                value={hapticsEnabled}
                onValueChange={(value) => {
                  if (value) {
                    triggerHaptic();
                  }
                  setHapticsEnabled(value);
                }}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={hapticsEnabled ? colors.primary : colors.white}
              />
            }
          />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection
          title={t('settings.notifications')}
          isExpanded={expandedSections.notifications}
          onToggle={() => toggleSection('notifications')}
        >
          <NotificationRow
            icon="heart-outline"
            label={t('settings.notif_likes')}
            description={t('settings.notif_likes_desc')}
            settings={preferences.notifications.likes}
            onEmailChange={(value) => updateNotificationChannel('likes', 'email', value)}
            onPushChange={(value) => updateNotificationChannel('likes', 'push', value)}
          />
          <NotificationRow
            icon="chatbubble-outline"
            label={t('settings.notif_comments')}
            description={t('settings.notif_comments_desc')}
            settings={preferences.notifications.comments}
            onEmailChange={(value) => updateNotificationChannel('comments', 'email', value)}
            onPushChange={(value) => updateNotificationChannel('comments', 'push', value)}
          />
          <NotificationRow
            icon="person-add-outline"
            label={t('settings.notif_follows')}
            description={t('settings.notif_follows_desc')}
            settings={preferences.notifications.follows}
            onEmailChange={(value) => updateNotificationChannel('follows', 'email', value)}
            onPushChange={(value) => updateNotificationChannel('follows', 'push', value)}
          />
          <NotificationRow
            icon="chatbubbles-outline"
            label={t('settings.notif_messages')}
            description={t('settings.notif_messages_desc')}
            settings={preferences.notifications.messages}
            onEmailChange={(value) => updateNotificationChannel('messages', 'email', value)}
            onPushChange={(value) => updateNotificationChannel('messages', 'push', value)}
          />
          <NotificationRow
            icon="calendar-outline"
            label={t('settings.notif_event_reminders')}
            description={t('settings.notif_event_reminders_desc')}
            settings={preferences.notifications.event_reminders}
            onEmailChange={(value) => updateNotificationChannel('event_reminders', 'email', value)}
            onPushChange={(value) => updateNotificationChannel('event_reminders', 'push', value)}
          />
          <NotificationRow
            icon="stats-chart-outline"
            label={t('settings.notif_weekly_summary')}
            description={t('settings.notif_weekly_summary_desc')}
            settings={preferences.notifications.weekly_summary}
            onEmailChange={(value) => updateNotificationChannel('weekly_summary', 'email', value)}
            onPushChange={(value) => updateNotificationChannel('weekly_summary', 'push', value)}
          />
          <NotificationRow
            icon="thumbs-up-outline"
            label={t('settings.notif_activity_reactions')}
            description={t('settings.notif_activity_reactions_desc')}
            settings={preferences.notifications.activity_reactions}
            onEmailChange={(value) => updateNotificationChannel('activity_reactions', 'email', value)}
            onPushChange={(value) => updateNotificationChannel('activity_reactions', 'push', value)}
          />
          <NotificationRow
            icon="at-outline"
            label={t('settings.notif_mentions')}
            description={t('settings.notif_mentions_desc')}
            settings={preferences.notifications.mentions}
            onEmailChange={(value) => updateNotificationChannel('mentions', 'email', value)}
            onPushChange={(value) => updateNotificationChannel('mentions', 'push', value)}
          />
          <NotificationRow
            icon="bar-chart-outline"
            label={t('settings.notif_training_week_feedback')}
            description={t('settings.notif_training_week_feedback_desc')}
            settings={preferences.notifications.training_week_feedback}
            onEmailChange={(value) => updateNotificationChannel('training_week_feedback', 'email', value)}
            onPushChange={(value) => updateNotificationChannel('training_week_feedback', 'push', value)}
          />
        </SettingsSection>

        {/* Privacy */}
        <SettingsSection
          title={t('settings.privacy')}
          isExpanded={expandedSections.privacy}
          onToggle={() => toggleSection('privacy')}
        >
          <SettingsRow
            icon="eye-outline"
            label={t('settings.profileVisibility')}
            value={getVisibilityLabel(preferences.privacy.profile_visibility)}
            onPress={() => updateNestedPreference('privacy', 'profile_visibility', cycleVisibility(preferences.privacy.profile_visibility))}
          />
          <SettingsRow
            icon="fitness-outline"
            label={t('settings.showActivities')}
            rightElement={
              <Switch
                value={preferences.privacy.show_activities}
                onValueChange={(value) => updateNestedPreference('privacy', 'show_activities', value)}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={preferences.privacy.show_activities ? colors.primary : colors.white}
              />
            }
          />
          <SettingsRow
            icon="stats-chart-outline"
            label={t('settings.showStats')}
            rightElement={
              <Switch
                value={preferences.privacy.show_stats}
                onValueChange={(value) => updateNestedPreference('privacy', 'show_stats', value)}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={preferences.privacy.show_stats ? colors.primary : colors.white}
              />
            }
          />
          <SettingsRow
            icon="mail-open-outline"
            label={t('settings.allowMessages')}
            value={getMessagesLabel(preferences.privacy.allow_messages)}
            onPress={() => updateNestedPreference('privacy', 'allow_messages', cycleMessages(preferences.privacy.allow_messages))}
          />
        </SettingsSection>

        {/* Privacy & Safety */}
        <SettingsSection
          title={t('settings.privacySafety.title')}
          isExpanded={expandedSections.privacySafety}
          onToggle={() => toggleSection('privacySafety')}
        >
          <SettingsRow
            icon="shield-outline"
            label={t('settings.privacySafety.blockedUsers')}
            onPress={() => navigation.navigate('BlockedUsers')}
          />
        </SettingsSection>

        {/* Activity Defaults */}
        <SettingsSection
          title={t('settings.activityDefaults')}
          isExpanded={expandedSections.activityDefaults}
          onToggle={() => toggleSection('activityDefaults')}
        >
          <SettingsRow
            icon="fitness-outline"
            label={t('settings.favoriteSport')}
            value={sportsLoading ? t('common.loading') : getFavoriteSportLabel()}
            onPress={() => !sportsLoading && setShowSportModal(true)}
          />
          <SettingsRow
            icon="globe-outline"
            label={t('settings.defaultVisibility')}
            value={getVisibilityLabel(preferences.activity_defaults.visibility)}
            onPress={() => updateNestedPreference('activity_defaults', 'visibility', cycleVisibility(preferences.activity_defaults.visibility))}
          />
          <SettingsRow
            icon="share-outline"
            label={t('settings.autoShare')}
            rightElement={
              <Switch
                value={preferences.activity_defaults.auto_share}
                onValueChange={(value) => updateNestedPreference('activity_defaults', 'auto_share', value)}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={preferences.activity_defaults.auto_share ? colors.primary : colors.white}
              />
            }
          />
        </SettingsSection>

        {/* Heart Rate Sync */}
        <SettingsSection
          title={t('settings.healthSync.title')}
          isExpanded={expandedSections.healthSync}
          onToggle={() => toggleSection('healthSync')}
        >
          <View style={[styles.formSection, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
            <Text style={[styles.healthSyncDescription, { color: colors.textSecondary }]}>
              {t('settings.healthSync.description')}
            </Text>
          </View>
          <SettingsRow
            icon="heart-outline"
            label={t('settings.healthSync.enable')}
            rightElement={
              <Switch
                value={healthSyncEnabled}
                onValueChange={() => {
                  triggerHaptic();
                  toggleHealthSync();
                }}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={healthSyncEnabled ? colors.primary : colors.white}
                disabled={healthSyncLoading || healthStatus === 'not_available'}
              />
            }
          />
          <SettingsRow
            icon="pulse-outline"
            label={t('settings.healthSync.status')}
            value={
              healthStatus === 'available'
                ? (Platform.OS === 'ios'
                    ? t('settings.healthSync.sourceAppleHealth')
                    : t('settings.healthSync.sourceHealthConnect'))
                : healthStatus === 'not_installed'
                  ? t('settings.healthSync.statusNotInstalled')
                  : t('settings.healthSync.statusNotAvailable')
            }
          />
          {healthSyncEnabled && healthStatus === 'available' && !hasHealthPermission && (
            <SettingsRow
              icon="key-outline"
              label={t('settings.healthSync.grantPermission')}
              onPress={() => {
                triggerHaptic();
                requestHealthPermission();
              }}
            />
          )}
          {healthSyncEnabled && hasHealthPermission && (
            <SettingsRow
              icon="checkmark-circle-outline"
              label={t('settings.healthSync.permissionGranted')}
            />
          )}
        </SettingsSection>

        {/* AI Posts Settings */}
        <SettingsSection
          title={t('settings.aiPosts.title')}
          isExpanded={expandedSections.aiPosts}
          onToggle={() => toggleSection('aiPosts')}
        >
          <AiPostsSettings
            preferences={preferences.ai_posts}
            onPreferenceChange={updateAiPostsPreference}
            isUpdating={isUpdatingAiPosts}
            embedded
          />
        </SettingsSection>

        {/* Debug Logs (only visible in dev mode when enabled) */}
        <DebugLogsSection />

        {/* App Section */}
        <SettingsSection
          title={t('settings.app')}
          isExpanded={expandedSections.app}
          onToggle={() => toggleSection('app')}
        >
          {/* About/Branding */}
          <View style={[styles.aboutSection, { borderBottomColor: colors.border }]}>
            <BrandLogo category="logo-full" variant={isDark ? 'light' : 'dark'} width={160} height={45} />
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>
              {t('settings.version')} {appVersion}
            </Text>
            <Text style={[styles.copyrightText, { color: colors.textMuted }]}>
              © {new Date().getFullYear()} Racefy. {t('settings.allRightsReserved')}
            </Text>
          </View>
          <SettingsRow
            icon="log-out-outline"
            label={t('common.logout')}
            onPress={handleLogout}
          />
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection
          title={t('settings.dangerZone')}
          isExpanded={expandedSections.dangerZone}
          onToggle={() => toggleSection('dangerZone')}
          titleColor={colors.error}
        >
          <SettingsRow
            icon="trash-outline"
            label={t('settings.deleteAccount')}
            onPress={() => setShowDeleteAccount(!showDeleteAccount)}
            danger
          />
          {/* Delete Account Form */}
          {showDeleteAccount && (
            <View style={[styles.formSection, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
              <Text style={[styles.dangerText, { color: colors.error }]}>{t('settings.deleteAccountWarning')}</Text>
              <Input
                label={t('settings.confirmPassword')}
                placeholder={t('settings.enterPasswordToDelete')}
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
              />
              <Button
                title={t('settings.deleteAccountButton')}
                onPress={handleDeleteAccount}
                loading={isDeleting}
                variant="danger"
                style={styles.formButton}
              />
            </View>
          )}
        </SettingsSection>
      </ScrollView>

      {/* Sport Selection Modal */}
      <Modal
        visible={showSportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSportModal(false)}
      >
        <ScreenContainer style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowSportModal(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('settings.selectFavoriteSport')}</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          {sportsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {t('common.loading')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={[{ id: null, name: t('settings.noSportSelected'), slug: 'none', icon: 'close-circle-outline' as keyof typeof Ionicons.glyphMap, is_active: true }, ...sportTypes]}
              keyExtractor={(item) => item.id?.toString() || 'none'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.sportItem,
                    { borderBottomColor: colors.border },
                    preferences.activity_defaults.favorite_sport_id === item.id && { backgroundColor: colors.successLight }
                  ]}
                  onPress={() => handleSelectFavoriteSport(item.id ? item as SportTypeWithIcon : null)}
                >
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={preferences.activity_defaults.favorite_sport_id === item.id ? colors.primary : colors.textSecondary}
                    style={styles.sportIcon}
                  />
                  <Text style={[
                    styles.sportName,
                    { color: preferences.activity_defaults.favorite_sport_id === item.id ? colors.primary : colors.textPrimary }
                  ]}>
                    {item.name}
                  </Text>
                  {preferences.activity_defaults.favorite_sport_id === item.id && (
                    <Ionicons name="checkmark" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.sportList}
            />
          )}
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  section: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: spacing.md,
  },
  rowLabel: {
    fontSize: fontSize.md,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowValue: {
    fontSize: fontSize.md,
  },
  formSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  formButton: {
    marginTop: spacing.sm,
  },
  logoutSection: {
    marginTop: spacing.xl,
  },
  dangerText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  // Notification row styles
  notificationRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  notificationIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  notificationLabelContainer: {
    flex: 1,
  },
  notificationLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  notificationDescription: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  notificationToggles: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xl,
    marginTop: spacing.xs,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleLabel: {
    fontSize: fontSize.sm,
  },
  // About section styles
  aboutSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
  },
  versionText: {
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
  copyrightText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  // Sport selection modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    padding: spacing.xs,
    width: 44,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  modalHeaderSpacer: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  loadingText: {
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  sportList: {
    paddingBottom: spacing.xl,
  },
  sportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  sportIcon: {
    marginRight: spacing.md,
  },
  sportName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  healthSyncDescription: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
