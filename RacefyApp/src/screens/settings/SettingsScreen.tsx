import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import * as Application from 'expo-application';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AiPostsSettings,
  AudioCoachSettings,
  BrandLogo,
  DebugLogsSection,
  LiveBroadcastSettings,
  MapStylePicker,
  PremiumTeaser,
  PrivacyConsentsSection,
  ScreenContainer,
  ScreenHeader,
  SettingsSection,
} from '../../components';
import { useNavSectionCount } from '../../hooks/useNavBadges';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { ChangePasswordForm } from './components/ChangePasswordForm';
import { DeleteAccountForm } from './components/DeleteAccountForm';
import { DevToolsSection } from './components/DevToolsSection';
import { FavoriteSportModal } from './components/FavoriteSportModal';
import { NotificationSettings } from './components/NotificationSettings';
import { SettingsRow } from './components/SettingsRows';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { useTheme } from '../../hooks/useTheme';
import { triggerHaptic, useHaptics } from '../../hooks/useHaptics';
import { type SportTypeWithIcon, useSportTypes } from '../../hooks/useSportTypes';
import { useHealthSync } from '../../hooks/useHealthSync';
import { useUnits } from '../../hooks/useUnits';
import { countPendingFinishes } from '../../services/trackingDb';

import { logger } from '../../services/logger';
import { pushNotificationService } from '../../services/pushNotifications';
import { buildInfo } from '../../config/buildInfo';
import { changeLanguage, supportedLanguages } from '../../i18n';
import { fontSize, spacing } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { UserPreferences } from '../../types/api';
import { formatIntlDate } from '../../utils/dateFormat';

const SETTINGS_SECTIONS_KEY = '@racefy_settings_sections';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const newFeedback = useNavSectionCount('feedback');
  const { user, logout } = useAuth();
  const { tier, isPremium, isTrial, remainingDays, expiresAt, canUse } = useSubscription();
  const { colors, isDark, themePreference, setThemePreference } = useTheme();
  const { isEnabled: hapticsEnabled, setEnabled: setHapticsEnabled } = useHaptics();
  const { setUnits } = useUnits();

  const {
    preferences,
    isLoading,
    isUpdatingAiPosts,
    updatePreference,
    updateNestedPreference,
    updateNotificationChannel,
    updateLiveNotification,
    updateAiPostsPreference,
  } = useUserPreferences();

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

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
    accountSubscription: true,
    general: false,
    activityTraining: false,
    notifications: false,
    privacySafety: false,
    liveBroadcasting: false,
    legalSupport: false,
    app: true,
    dangerZone: false,
    adminTools: false,
    devTools: false,
  });

  // Load saved section states from storage
  useEffect(() => {
    const loadSectionStates = async () => {
      try {
        const saved = await AsyncStorage.getItem(SETTINGS_SECTIONS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setExpandedSections((prev) => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        logger.debug('general', 'Failed to load section states', { error });
      }
    };
    loadSectionStates();
  }, []);

  const toggleSection = useCallback(async (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => {
      const newState = { ...prev, [section]: !prev[section] };
      // Save to storage (async, don't await)
      AsyncStorage.setItem(SETTINGS_SECTIONS_KEY, JSON.stringify(newState)).catch((err) => {
        logger.debug('general', 'Failed to save section states', { error: err });
      });
      return newState;
    });
  }, []);

  const appVersion = Application.nativeApplicationVersion || '1.0.0';
  const backendTargetLabel = (target: typeof buildInfo.apiTarget): string => {
    switch (target) {
      case 'prod':
        return t('settings.buildInfo.prod');
      case 'stage':
        return t('settings.buildInfo.stage');
      case 'local':
        return t('settings.buildInfo.local');
      default:
        return t('settings.buildInfo.none');
    }
  };

  // Training reminders summary for settings row
  const trainingRemindersSummary = (() => {
    const tr = (preferences as any).training_reminders;
    if (!tr?.enabled) return t('settings.trainingReminders.off', 'Off');
    const dayLabels: Record<string, string[]> = {
      en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      pl: ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'],
      es: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    };
    const lang = preferences.language || 'en';
    const labels = dayLabels[lang] || dayLabels.en;
    const selectedDays = (tr.days || []).map((d: number) => labels[d]).join(', ');
    const time = tr.time || '08:00';
    return selectedDays
      ? `${selectedDays} ${t('settings.trainingReminders.at')} ${time}`
      : t('settings.trainingReminders.on', 'On');
  })();

  const handleLogout = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    // Activities saved on the phone go out only from the account that recorded
    // them — after a sign-out they wait (nothing is lost), which is worth saying.
    const owed = countPendingFinishes();
    const message =
      owed > 0
        ? `${t('profile.logoutConfirm')}\n\n${t('unsynced.logoutWarning', { count: owed })}`
        : t('profile.logoutConfirm');
    Alert.alert(t('common.logout'), message, [
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
    const sport = sportTypes.find((s) => s.id === sportId);
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
      <ScreenHeader title={t('settings.title')} showBack onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* ══════════════════════════════════════════════════════════
            1. ACCOUNT & SUBSCRIPTION
            ══════════════════════════════════════════════════════════ */}
        <SettingsSection
          title={t('settings.account')}
          isExpanded={expandedSections.accountSubscription}
          onToggle={() => toggleSection('accountSubscription')}
        >
          <SettingsRow
            icon="person-outline"
            label={t('settings.editProfile')}
            onPress={() => navigation.navigate('EditProfile')}
          />
          <SettingsRow
            icon="lock-closed-outline"
            label={t('settings.changePassword')}
            onPress={() => setShowPasswordChange(!showPasswordChange)}
          />
          {showPasswordChange && <ChangePasswordForm onDone={() => setShowPasswordChange(false)} />}
          {/* Subscription info */}
          <View
            style={[
              styles.subscriptionCard,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
          >
            <View style={styles.subscriptionRow}>
              <Text style={[styles.subscriptionLabel, { color: colors.textSecondary }]}>
                {t('settings.currentPlan')}
              </Text>
              <View style={styles.subscriptionPlanRow}>
                <Text
                  style={[
                    styles.subscriptionPlanValue,
                    { color: isPremium ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {t(`settings.plan${tier.charAt(0).toUpperCase() + tier.slice(1)}`)}
                </Text>
                {isTrial && (
                  <View
                    style={[
                      styles.subscriptionTrialBadge,
                      { backgroundColor: colors.primary + '20' },
                    ]}
                  >
                    <Text style={[styles.subscriptionTrialBadgeText, { color: colors.primary }]}>
                      {t('settings.trialBadge')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            {isTrial && remainingDays !== null && (
              <Text style={[styles.subscriptionExpiry, { color: colors.textMuted }]}>
                {t('settings.trialEndsOn', { date: remainingDays + 'd' })}
              </Text>
            )}
            {!isTrial && isPremium && expiresAt && (
              <Text style={[styles.subscriptionExpiry, { color: colors.textMuted }]}>
                {t('settings.expiresOn', { date: formatIntlDate(expiresAt) })}
              </Text>
            )}
          </View>
          <SettingsRow
            icon={isPremium ? 'swap-horizontal-outline' : 'diamond-outline'}
            label={isPremium ? t('settings.changePlan') : t('settings.upgradePlan')}
            onPress={() => navigation.navigate('Paywall', {})}
          />
          {isPremium && (
            <SettingsRow
              icon="card-outline"
              label={t('subscription.manageSub')}
              onPress={() => navigation.navigate('Paywall', {})}
            />
          )}
        </SettingsSection>

        {/* ══════════════════════════════════════════════════════════
            2. GENERAL PREFERENCES
            ══════════════════════════════════════════════════════════ */}
        <SettingsSection
          title={t('settings.preferences')}
          isExpanded={expandedSections.general}
          onToggle={() => toggleSection('general')}
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
            value={
              supportedLanguages.find((l) => l.code === preferences.language)?.nativeName ||
              'English'
            }
            onPress={() => {
              const langs = supportedLanguages;
              const currentIndex = langs.findIndex((l) => l.code === preferences.language);
              const nextIndex = (currentIndex + 1) % langs.length;
              const newLang = langs[nextIndex].code as UserPreferences['language'];
              changeLanguage(newLang);
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
          <MapStylePicker />
        </SettingsSection>

        {/* ══════════════════════════════════════════════════════════
            3. ACTIVITY & TRAINING
            ══════════════════════════════════════════════════════════ */}
        <SettingsSection
          title={t('settings.activityDefaults')}
          isExpanded={expandedSections.activityTraining}
          onToggle={() => toggleSection('activityTraining')}
        >
          {/* Activity defaults */}
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
            onPress={() =>
              updateNestedPreference(
                'activity_defaults',
                'visibility',
                cycleVisibility(preferences.activity_defaults.visibility),
              )
            }
          />
          <SettingsRow
            icon="share-outline"
            label={t('settings.autoShare')}
            rightElement={
              <Switch
                value={preferences.activity_defaults.auto_share}
                onValueChange={(value) =>
                  updateNestedPreference('activity_defaults', 'auto_share', value)
                }
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={
                  preferences.activity_defaults.auto_share ? colors.primary : colors.white
                }
              />
            }
          />
          {/* Health Sync */}
          <View
            style={[
              styles.formSection,
              { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
            ]}
          >
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
                ? Platform.OS === 'ios'
                  ? t('settings.healthSync.sourceAppleHealth')
                  : t('settings.healthSync.sourceHealthConnect')
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
          {/* Training Reminders */}
          <SettingsRow
            icon="notifications-outline"
            label={t('settings.trainingReminders.title')}
            value={trainingRemindersSummary}
            onPress={() => navigation.navigate('TrainingReminders')}
          />
          {/* Audio Coach */}
          <AudioCoachSettings embedded />
          {/* AI Posts */}
          {canUse('ai_posts_monthly') ? (
            <AiPostsSettings
              preferences={preferences.ai_posts}
              onPreferenceChange={updateAiPostsPreference}
              isUpdating={isUpdatingAiPosts}
              embedded
            />
          ) : (
            <PremiumTeaser feature="ai_posts_monthly">
              <AiPostsSettings
                preferences={preferences.ai_posts}
                onPreferenceChange={async () => {}}
                isUpdating={false}
                embedded
              />
            </PremiumTeaser>
          )}
        </SettingsSection>

        {/* ══════════════════════════════════════════════════════════
            4. NOTIFICATIONS
            ══════════════════════════════════════════════════════════ */}
        <SettingsSection
          title={t('settings.notifications')}
          isExpanded={expandedSections.notifications}
          onToggle={() => toggleSection('notifications')}
        >
          <NotificationSettings
            notifications={preferences.notifications}
            onLiveChange={updateLiveNotification}
            onChannelChange={updateNotificationChannel}
          />
        </SettingsSection>

        {/* ══════════════════════════════════════════════════════════
            5. PRIVACY & SAFETY (merged)
            ══════════════════════════════════════════════════════════ */}
        <SettingsSection
          title={t('settings.privacySafety.title')}
          isExpanded={expandedSections.privacySafety}
          onToggle={() => toggleSection('privacySafety')}
        >
          <SettingsRow
            icon="eye-outline"
            label={t('settings.profileVisibility')}
            value={getVisibilityLabel(preferences.privacy.profile_visibility)}
            onPress={() =>
              updateNestedPreference(
                'privacy',
                'profile_visibility',
                cycleVisibility(preferences.privacy.profile_visibility),
              )
            }
          />
          <SettingsRow
            icon="fitness-outline"
            label={t('settings.showActivities')}
            rightElement={
              <Switch
                value={preferences.privacy.show_activities}
                onValueChange={(value) =>
                  updateNestedPreference('privacy', 'show_activities', value)
                }
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
            onPress={() =>
              updateNestedPreference(
                'privacy',
                'allow_messages',
                cycleMessages(preferences.privacy.allow_messages),
              )
            }
          />
          <SettingsRow
            icon="trophy-outline"
            label={t('settings.shareAchievements')}
            rightElement={
              <Switch
                value={preferences.privacy.share_achievements ?? true}
                onValueChange={(value) =>
                  updateNestedPreference('privacy', 'share_achievements', value)
                }
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={
                  (preferences.privacy.share_achievements ?? true) ? colors.primary : colors.white
                }
              />
            }
          />
          <SettingsRow
            icon="flag-outline"
            label={t('settings.showStartFinish')}
            rightElement={
              <Switch
                value={preferences.privacy.show_start_finish_points ?? true}
                onValueChange={(value) =>
                  updateNestedPreference('privacy', 'show_start_finish_points', value)
                }
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={
                  (preferences.privacy.show_start_finish_points ?? true)
                    ? colors.primary
                    : colors.white
                }
              />
            }
          />
          <SettingsRow
            icon="location-outline"
            label={t('settings.privacySafety.privacyZones')}
            onPress={() => navigation.navigate('PrivacyZones')}
          />
          <SettingsRow
            icon="shield-outline"
            label={t('settings.privacySafety.blockedUsers')}
            onPress={() => navigation.navigate('BlockedUsers')}
          />
        </SettingsSection>

        {/* ══════════════════════════════════════════════════════════
            5b. LIVE BROADCASTING
            Its own section rather than a row inside privacy: these are
            consents about sharing real-time location, and burying them
            would understate what they permit.
            ══════════════════════════════════════════════════════════ */}
        <SettingsSection
          title={t('live.settings.title')}
          isExpanded={expandedSections.liveBroadcasting}
          onToggle={() => toggleSection('liveBroadcasting')}
        >
          <LiveBroadcastSettings />
        </SettingsSection>

        {/* ══════════════════════════════════════════════════════════
            6. LEGAL & SUPPORT
            ══════════════════════════════════════════════════════════ */}
        <SettingsSection
          title={t('legal.consentsTitle')}
          isExpanded={expandedSections.legalSupport}
          onToggle={() => toggleSection('legalSupport')}
        >
          <PrivacyConsentsSection embedded />
          <SettingsRow
            icon="chatbubbles-outline"
            label={t('settings.privacySafety.feedbackAndBugs')}
            value={newFeedback > 0 ? t('navBadges.newCount', { count: newFeedback }) : undefined}
            onPress={() => navigation.navigate('FeedbackList')}
          />
        </SettingsSection>

        {/* ══════════════════════════════════════════════════════════
            7. APP INFO
            ══════════════════════════════════════════════════════════ */}
        <SettingsSection
          title={t('settings.app')}
          isExpanded={expandedSections.app}
          onToggle={() => toggleSection('app')}
        >
          <View style={[styles.aboutSection, { borderBottomColor: colors.border }]}>
            <BrandLogo
              category="logo-full"
              variant={isDark ? 'light' : 'dark'}
              width={160}
              height={45}
            />
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>
              {t('settings.version')} {appVersion}
            </Text>
            <Text style={[styles.copyrightText, { color: colors.textMuted }]}>
              © {new Date().getFullYear()} Racefy. {t('settings.allRightsReserved')}
            </Text>
          </View>
          {/* Which backend / projects this build is wired to — lets a tester tell
              a prod build from a stage one without reading URLs. */}
          <SettingsRow
            icon="server-outline"
            label={t('settings.buildInfo.api')}
            value={backendTargetLabel(buildInfo.apiTarget)}
          />
          <SettingsRow
            icon="flame-outline"
            label={t('settings.buildInfo.firebase')}
            value={backendTargetLabel(buildInfo.firebaseTarget)}
          />
          <SettingsRow
            icon="logo-google"
            label={t('settings.buildInfo.googleSignIn')}
            value={buildInfo.googleProjectNumber ?? t('settings.buildInfo.none')}
          />
          <SettingsRow
            icon="notifications-outline"
            label={t('settings.buildInfo.push')}
            value={pushNotificationService.getProvider().toUpperCase()}
          />
          <SettingsRow icon="log-out-outline" label={t('common.logout')} onPress={handleLogout} />
        </SettingsSection>

        {/* ══════════════════════════════════════════════════════════
            8. DANGER ZONE
            ══════════════════════════════════════════════════════════ */}
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
          {showDeleteAccount && <DeleteAccountForm />}
        </SettingsSection>

        {/* ══════════════════════════════════════════════════════════
            ADMIN TOOLS (admin only)
            ══════════════════════════════════════════════════════════ */}
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

        {/* ══════════════════════════════════════════════════════════
            DEV TOOLS (__DEV__ only)
            ══════════════════════════════════════════════════════════ */}
        <DebugLogsSection />
        {__DEV__ && (
          <SettingsSection
            title="Dev Tools"
            isExpanded={expandedSections.devTools}
            onToggle={() => toggleSection('devTools')}
          >
            <DevToolsSection />
          </SettingsSection>
        )}
      </ScrollView>

      <FavoriteSportModal
        visible={showSportModal}
        sportTypes={sportTypes}
        isLoading={sportsLoading}
        selectedId={preferences.activity_defaults.favorite_sport_id}
        onSelect={handleSelectFavoriteSport}
        onClose={() => setShowSportModal(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  formSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  // Notification row styles
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
  healthSyncDescription: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  subscriptionCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionLabel: {
    fontSize: fontSize.sm,
  },
  subscriptionPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  subscriptionPlanValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  subscriptionTrialBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subscriptionTrialBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  subscriptionExpiry: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});
