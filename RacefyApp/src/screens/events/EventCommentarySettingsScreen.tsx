import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useCommentarySettings } from '../../hooks/useCommentarySettings';
import { useGenerateCommentary } from '../../hooks/useGenerateCommentary';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius, fontSize } from '../../theme';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ScreenContainer } from '../../components';
import { api } from '../../services/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  CommentaryStyle,
  CommentaryLanguage,
  CommentaryType,
  Event,
} from '../../types/api';

type RootStackParamList = {
  EventCommentarySettings: { eventId: number };
};

type Props = NativeStackScreenProps<
  RootStackParamList,
  'EventCommentarySettings'
>;

export function EventCommentarySettingsScreen({ route, navigation }: Props) {
  const { eventId } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);

  const {
    settings,
    isLoading,
    isSaving,
    error,
    updateSettings,
    tokensUsed,
    tokenLimit,
    tokenUsagePercent,
    isNearLimit,
  } = useCommentarySettings(eventId);

  const {
    generate,
    isGenerating,
    error: generateError,
    clearError,
  } = useGenerateCommentary(eventId);

  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    general: true,
    advanced: false,
    languages: false,
  });

  // Fetch event to check status
  useEffect(() => {
    let isMounted = true;

    const fetchEvent = async () => {
      try {
        const eventData = await api.getEvent(eventId);
        if (isMounted) {
          setEvent(eventData);
        }
      } catch (error) {
        // Silently fail, we'll still show settings
        console.error('Failed to fetch event:', error);
      } finally {
        if (isMounted) {
          setIsLoadingEvent(false);
        }
      }
    };

    fetchEvent();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  // Check if event is read-only (completed or cancelled)
  const isReadOnly = event?.status === 'completed' || event?.status === 'cancelled';

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleToggleEnabled = async (value: boolean) => {
    try {
      await updateSettings({ enabled: value });
    } catch (err) {
      Alert.alert(
        t('commentary.error', 'Error'),
        t('commentary.updateFailed', 'Failed to update commentary settings')
      );
    }
  };

  const handleStyleChange = async (style: CommentaryStyle) => {
    try {
      await updateSettings({ style });
    } catch (err) {
      Alert.alert(
        t('commentary.error', 'Error'),
        t('commentary.updateFailed', 'Failed to update commentary settings')
      );
    }
  };

  const handleIntervalChange = async (interval: number) => {
    try {
      await updateSettings({ interval_minutes: interval });
    } catch (err) {
      Alert.alert(
        t('commentary.error', 'Error'),
        t('commentary.updateFailed', 'Failed to update commentary settings')
      );
    }
  };

  const handleToggleAutoPublish = async (value: boolean) => {
    try {
      await updateSettings({ auto_publish: value });
    } catch (err) {
      Alert.alert(
        t('commentary.error', 'Error'),
        t('commentary.updateFailed', 'Failed to update commentary settings')
      );
    }
  };

  const handleToggleLanguage = async (language: CommentaryLanguage) => {
    if (!settings) return;

    const currentLanguages = settings.languages || [];
    const newLanguages = currentLanguages.includes(language)
      ? currentLanguages.filter((l) => l !== language)
      : [...currentLanguages, language];

    // Don't allow deselecting all languages
    if (newLanguages.length === 0) {
      Alert.alert(
        t('commentary.warning', 'Warning'),
        t('commentary.atLeastOneLanguage', 'At least one language must be selected')
      );
      return;
    }

    try {
      await updateSettings({ languages: newLanguages });
    } catch (err) {
      Alert.alert(
        t('commentary.error', 'Error'),
        t('commentary.updateFailed', 'Failed to update commentary settings')
      );
    }
  };

  const handleGenerateCommentary = async (type: CommentaryType) => {
    clearError();

    Alert.alert(
      t('commentary.generate', 'Generate Commentary'),
      t(
        'commentary.generateConfirm',
        `Generate a ${type} commentary update? This will use tokens from your limit.`
      ),
      [
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel',
        },
        {
          text: t('common.generate', 'Generate'),
          onPress: async () => {
            try {
              await generate(type);
              Alert.alert(
                t('common.success', 'Success'),
                t(
                  'commentary.generateStarted',
                  'Commentary generation has been started. It will appear in the feed shortly.'
                )
              );
            } catch (err) {
              Alert.alert(
                t('commentary.error', 'Error'),
                generateError ||
                  t('commentary.generateFailed', 'Failed to generate commentary')
              );
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('commentary.settings', 'Commentary Settings')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (error || !settings) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('commentary.settings', 'Commentary Settings')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error || t('commentary.loadFailed', 'Failed to load settings')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('commentary.settings', 'Commentary Settings')}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Read-Only Notice */}
        {isReadOnly && (
          <View
            style={[
              styles.readOnlyNotice,
              {
                backgroundColor: colors.warningLight || colors.warning + '20',
                borderColor: colors.warning,
              },
            ]}
          >
            <Ionicons name="lock-closed" size={20} color={colors.warning} />
            <View style={styles.readOnlyTextContainer}>
              <Text style={[styles.readOnlyTitle, { color: colors.warning }]}>
                {t('commentary.readOnly', 'Read-Only Mode')}
              </Text>
              <Text style={[styles.readOnlyMessage, { color: colors.textSecondary }]}>
                {t(
                  'commentary.readOnlyMessage',
                  'Settings cannot be modified for completed or cancelled events'
                )}
              </Text>
            </View>
          </View>
        )}

        {/* Token Usage */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('commentary.tokenUsage', 'Token Usage')}
          </Text>
          <View style={styles.tokenStats}>
            <Text
              style={[
                styles.tokenValue,
                {
                  color: isNearLimit ? colors.warning : colors.textPrimary,
                },
              ]}
            >
              {tokensUsed} / {tokenLimit || t('commentary.unlimited', 'Unlimited')}
            </Text>
            {tokenLimit > 0 && (
              <Text style={[styles.tokenPercent, { color: colors.textSecondary }]}>
                ({tokenUsagePercent.toFixed(1)}%)
              </Text>
            )}
          </View>
          {tokenLimit > 0 && (
            <View
              style={[styles.progressBar, { backgroundColor: colors.borderLight }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(tokenUsagePercent, 100)}%`,
                    backgroundColor: isNearLimit ? colors.warning : colors.primary,
                  },
                ]}
              />
            </View>
          )}
        </Card>

        {/* General Settings */}
        <Card style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                {t('commentary.enableAI', 'Enable AI Commentary')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t(
                  'commentary.enableDescription',
                  'Generate AI commentary for this event'
                )}
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={handleToggleEnabled}
              disabled={isSaving || isReadOnly}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>
        </Card>

        {/* Style Selection */}
        {settings.enabled && (
          <>
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('commentary.style', 'Commentary Style')}
              </Text>
              {Object.entries(settings.available_styles).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.styleOption,
                    {
                      backgroundColor:
                        settings.style === key
                          ? colors.successLight
                          : colors.transparent,
                      borderColor:
                        settings.style === key ? colors.success : colors.border,
                      opacity: isReadOnly ? 0.5 : 1,
                    },
                  ]}
                  onPress={() => handleStyleChange(key as CommentaryStyle)}
                  disabled={isSaving || isReadOnly}
                >
                  <View style={styles.styleInfo}>
                    <Text
                      style={[
                        styles.styleName,
                        {
                          color:
                            settings.style === key
                              ? colors.success
                              : colors.textPrimary,
                        },
                      ]}
                    >
                      {value.name}
                    </Text>
                    <Text
                      style={[styles.styleDescription, { color: colors.textSecondary }]}
                    >
                      {value.description}
                    </Text>
                  </View>
                  {settings.style === key && (
                    <Text style={[styles.checkmark, { color: colors.success }]}>
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </Card>

            {/* Languages */}
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('commentary.languages', 'Languages')}
              </Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                {t(
                  'commentary.languagesDescription',
                  'Select which languages to generate commentary in'
                )}
              </Text>
              {Object.entries(settings.available_languages).map(([code, name]) => (
                <View key={code} style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    {name}
                  </Text>
                  <Switch
                    value={settings.languages.includes(code as CommentaryLanguage)}
                    onValueChange={() =>
                      handleToggleLanguage(code as CommentaryLanguage)
                    }
                    disabled={isSaving || isReadOnly}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    thumbColor={colors.white}
                  />
                </View>
              ))}
            </Card>

            {/* Advanced Settings */}
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('commentary.advanced', 'Advanced')}
              </Text>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    {t('commentary.autoPublish', 'Auto-publish')}
                  </Text>
                  <Text
                    style={[styles.settingDescription, { color: colors.textSecondary }]}
                  >
                    {t(
                      'commentary.autoPublishDescription',
                      'Automatically publish generated commentary'
                    )}
                  </Text>
                </View>
                <Switch
                  value={settings.auto_publish}
                  onValueChange={handleToggleAutoPublish}
                  disabled={isSaving || isReadOnly}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.divider} />

              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                {t('commentary.updateInterval', 'Update Interval')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t(
                  'commentary.updateIntervalDescription',
                  'How often to generate live updates'
                )}
              </Text>
              <View style={styles.intervalOptions}>
                {[5, 10, 15, 30, 60].map((interval) => (
                  <TouchableOpacity
                    key={interval}
                    style={[
                      styles.intervalButton,
                      {
                        backgroundColor:
                          settings.interval_minutes === interval
                            ? colors.primary
                            : colors.transparent,
                        borderColor:
                          settings.interval_minutes === interval
                            ? colors.primary
                            : colors.border,
                        opacity: isReadOnly ? 0.5 : 1,
                      },
                    ]}
                    onPress={() => handleIntervalChange(interval)}
                    disabled={isSaving || isReadOnly}
                  >
                    <Text
                      style={[
                        styles.intervalText,
                        {
                          color:
                            settings.interval_minutes === interval
                              ? colors.white
                              : colors.textPrimary,
                        },
                      ]}
                    >
                      {interval} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* Manual Generation */}
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('commentary.manualGeneration', 'Manual Generation')}
              </Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                {t(
                  'commentary.manualGenerationDescription',
                  'Generate commentary on demand'
                )}
              </Text>

              <View style={styles.generateButtons}>
                <Button
                  title={t('commentary.generateLive', 'Generate Live Update')}
                  onPress={() => handleGenerateCommentary('live')}
                  disabled={isGenerating || isSaving || isReadOnly}
                  variant="secondary"
                />
                <Button
                  title={t('commentary.generateSummary', 'Generate Summary')}
                  onPress={() => handleGenerateCommentary('summary')}
                  disabled={isGenerating || isSaving || isReadOnly}
                  variant="secondary"
                />
              </View>
            </Card>
          </>
        )}
      </ScrollView>
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
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  readOnlyNotice: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  readOnlyTextContainer: {
    flex: 1,
  },
  readOnlyTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  readOnlyMessage: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: 13,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  tokenStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  tokenValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  tokenPercent: {
    fontSize: 14,
    marginLeft: spacing.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  styleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  styleInfo: {
    flex: 1,
  },
  styleName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  styleDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  checkmark: {
    fontSize: 20,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: spacing.md,
  },
  intervalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  intervalButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  intervalText: {
    fontSize: 14,
    fontWeight: '600',
  },
  generateButtons: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
