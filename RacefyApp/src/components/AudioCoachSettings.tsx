import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useSubscription } from '../hooks/useSubscription';
import { triggerHaptic } from '../hooks/useHaptics';
import { useAudioCoachSettings } from '../hooks/useAudioCoachSettings';
import { useAudioFocusPrefs } from '../hooks/useAudioFocusPrefs';
import { buildAnnouncementText } from '../services/audioCoach/templates';
import { speakText } from '../services/audioCoach/tts';
import { borderRadius, fontSize, spacing } from '../theme';
import type { AudioFocusMode } from '../services/audioCoach/audioSession';
import type {
  AudioCoachLanguage,
  AudioCoachSettings as SettingsType,
  AudioCoachStyle,
  AudioCoachVoice,
} from '../types/audioCoach';

const INTERVAL_OPTIONS = [0.5, 1, 2, 5];

const AUDIO_FOCUS_OPTIONS: AudioFocusMode[] = ['duck', 'pause', 'mix'];

const STYLE_OPTIONS: AudioCoachStyle[] = ['neutral', 'motivational', 'coach', 'minimal'];

const LANGUAGE_OPTIONS: { value: AudioCoachLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'pl', label: 'Polski' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
];

const AI_VOICE_OPTIONS: { value: AudioCoachVoice; label: string }[] = [
  { value: 'alloy', label: 'Alloy' },
  { value: 'nova', label: 'Nova' },
  { value: 'echo', label: 'Echo' },
  { value: 'fable', label: 'Fable' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'shimmer', label: 'Shimmer' },
];

interface AudioCoachSettingsProps {
  embedded?: boolean;
}

export function AudioCoachSettings({ embedded = true }: AudioCoachSettingsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tier } = useSubscription();

  const { settings, planInfo, isLoading, loadSettings, updateSettings, loadPlanInfo } =
    useAudioCoachSettings();
  const { prefs: audioFocus, updatePrefs: updateAudioFocus } = useAudioFocusPrefs();

  useEffect(() => {
    loadSettings();
    loadPlanInfo();
  }, [loadSettings, loadPlanInfo]);

  const handleToggle = useCallback(
    (key: keyof SettingsType, value: any) => {
      triggerHaptic();
      updateSettings({ [key]: value });
    },
    [updateSettings],
  );

  const handleAudioFocusMode = useCallback(
    (mode: AudioFocusMode) => {
      triggerHaptic();
      updateAudioFocus({ mode });
    },
    [updateAudioFocus],
  );

  const handleVolumeStep = useCallback(
    (delta: number) => {
      triggerHaptic();
      // Rounded because repeated float steps otherwise drift to 0.7000000000001.
      const next = Math.round(Math.min(1, Math.max(0.3, audioFocus.volume + delta)) * 10) / 10;
      updateAudioFocus({ volume: next });
    },
    [audioFocus.volume, updateAudioFocus],
  );

  const handlePreview = useCallback(() => {
    triggerHaptic();
    const text = buildAnnouncementText({
      language: settings.language,
      style: settings.style,
      km: 5,
      pace: 5.5,
      heartRate: tier === 'pro' && settings.announceHeartRate ? 155 : undefined,
      splitDelta: tier === 'pro' && settings.announceSplitDelta ? -8 : undefined,
    });
    speakText(text, settings, tier as any, true);
  }, [settings, tier]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const isDisabled = !settings.enabled;
  const isPlusOrPro = tier === 'plus' || tier === 'pro';
  const isPro = tier === 'pro';

  return (
    <View
      style={
        embedded
          ? undefined
          : [
              styles.container,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]
      }
    >
      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t('settings.audioCoach.description')}
        </Text>
      </View>

      {/* Enable Toggle */}
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={styles.textColumn}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t('settings.audioCoach.enable')}
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t('settings.audioCoach.enableHint')}
          </Text>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={(value) => handleToggle('enabled', value)}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={settings.enabled ? colors.primary : colors.white}
        />
      </View>

      {/* Language */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
          {t('settings.audioCoach.language')}
        </Text>
        <View style={styles.chipGrid}>
          {LANGUAGE_OPTIONS.map((lang) => (
            <TouchableOpacity
              key={lang.value}
              style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: colors.cardBackground },
                settings.language === lang.value && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary,
                },
                isDisabled && styles.chipDisabled,
              ]}
              onPress={() => handleToggle('language', lang.value)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: colors.textSecondary },
                  settings.language === lang.value && { color: colors.white },
                ]}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Interval */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
          {t('settings.audioCoach.interval')}
        </Text>
        <View style={styles.chipRow}>
          {INTERVAL_OPTIONS.map((km) => (
            <TouchableOpacity
              key={km}
              style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: colors.cardBackground },
                settings.intervalKm === km && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary,
                },
                isDisabled && styles.chipDisabled,
              ]}
              onPress={() => handleToggle('intervalKm', km)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: colors.textSecondary },
                  settings.intervalKm === km && { color: colors.white },
                ]}
              >
                {km} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Style */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
          {t('settings.audioCoach.style')}
        </Text>
        <View style={styles.chipRow}>
          {STYLE_OPTIONS.map((style) => (
            <TouchableOpacity
              key={style}
              style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: colors.cardBackground },
                settings.style === style && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary,
                },
                isDisabled && styles.chipDisabled,
              ]}
              onPress={() => handleToggle('style', style)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: colors.textSecondary },
                  settings.style === style && { color: colors.white },
                ]}
              >
                {t(`settings.audioCoach.styles.${style}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Speech Rate */}
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <Text style={[styles.label, { color: isDisabled ? colors.textMuted : colors.textPrimary }]}>
          {t('settings.audioCoach.speechRate')}
        </Text>
        <View style={styles.rateControls}>
          <TouchableOpacity
            onPress={() => handleToggle('speechRate', Math.max(0.5, settings.speechRate - 0.1))}
            disabled={isDisabled || settings.speechRate <= 0.5}
          >
            <Ionicons
              name="remove-circle-outline"
              size={24}
              color={isDisabled ? colors.textMuted : colors.primary}
            />
          </TouchableOpacity>
          <Text style={[styles.rateValue, { color: colors.textPrimary }]}>
            {settings.speechRate.toFixed(1)}x
          </Text>
          <TouchableOpacity
            onPress={() => handleToggle('speechRate', Math.min(2.0, settings.speechRate + 0.1))}
            disabled={isDisabled || settings.speechRate >= 2.0}
          >
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={isDisabled ? colors.textMuted : colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Voice Section (Plus/Pro only) */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <View style={styles.textColumn}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                {t('settings.audioCoach.aiVoice')}
              </Text>
              {!isPlusOrPro && (
                <View style={[styles.tierBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.tierBadgeText, { color: colors.white }]}>PLUS</Text>
                </View>
              )}
            </View>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t('settings.audioCoach.aiVoiceHint')}
            </Text>
          </View>
          <Switch
            value={settings.useAiVoice}
            onValueChange={(value) => handleToggle('useAiVoice', value)}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={settings.useAiVoice ? colors.primary : colors.white}
            disabled={isDisabled || !isPlusOrPro}
          />
        </View>

        {settings.useAiVoice && isPlusOrPro && (
          <View style={styles.voiceGrid}>
            {AI_VOICE_OPTIONS.map((voice) => (
              <TouchableOpacity
                key={voice.value}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: colors.cardBackground },
                  settings.aiVoice === voice.value && {
                    borderColor: colors.primary,
                    backgroundColor: colors.primary,
                  },
                  isDisabled && styles.chipDisabled,
                ]}
                onPress={() => handleToggle('aiVoice', voice.value)}
                disabled={isDisabled}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: colors.textSecondary },
                    settings.aiVoice === voice.value && { color: colors.white },
                  ]}
                >
                  {voice.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* PRO features: Heart Rate & Split Delta */}
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={styles.textColumn}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('settings.audioCoach.heartRate')}
            </Text>
            {!isPro && (
              <View style={[styles.tierBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.tierBadgeText, { color: colors.primary }]}>PRO</Text>
              </View>
            )}
          </View>
        </View>
        <Switch
          value={settings.announceHeartRate}
          onValueChange={(value) => handleToggle('announceHeartRate', value)}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={settings.announceHeartRate ? colors.primary : colors.white}
          disabled={isDisabled || !isPro}
        />
      </View>

      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={styles.textColumn}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('settings.audioCoach.splitDelta')}
            </Text>
            {!isPro && (
              <View style={[styles.tierBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.tierBadgeText, { color: colors.primary }]}>PRO</Text>
              </View>
            )}
          </View>
        </View>
        <Switch
          value={settings.announceSplitDelta}
          onValueChange={(value) => handleToggle('announceSplitDelta', value)}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={settings.announceSplitDelta ? colors.primary : colors.white}
          disabled={isDisabled || !isPro}
        />
      </View>

      {/* Other apps' audio (music ducking) */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
          {t('settings.audioCoach.audioFocus')}
        </Text>
        <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          {t('settings.audioCoach.audioFocusHint')}
        </Text>
        <View style={styles.chipRow}>
          {AUDIO_FOCUS_OPTIONS.map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: colors.cardBackground },
                audioFocus.mode === mode && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => handleAudioFocusMode(mode)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: colors.textSecondary },
                  audioFocus.mode === mode && { color: colors.white },
                ]}
              >
                {t(`settings.audioCoach.audioFocusModes.${mode}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Announcement volume (AI voice playback) */}
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={styles.textColumn}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t('settings.audioCoach.announcementVolume')}
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t('settings.audioCoach.announcementVolumeHint')}
          </Text>
        </View>
        <View style={styles.rateControls}>
          <TouchableOpacity
            onPress={() => handleVolumeStep(-0.1)}
            disabled={audioFocus.volume <= 0.3}
          >
            <Ionicons
              name="remove-circle-outline"
              size={24}
              color={audioFocus.volume <= 0.3 ? colors.textMuted : colors.primary}
            />
          </TouchableOpacity>
          <Text style={[styles.rateValue, { color: colors.textPrimary }]}>
            {Math.round(audioFocus.volume * 100)}%
          </Text>
          <TouchableOpacity onPress={() => handleVolumeStep(0.1)} disabled={audioFocus.volume >= 1}>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={audioFocus.volume >= 1 ? colors.textMuted : colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Usage info */}
      {planInfo && isPlusOrPro && planInfo.monthlyCharacters != null && (
        <View style={[styles.usageContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.usageText, { color: colors.textSecondary }]}>
            {t('settings.audioCoach.usage', {
              used: (planInfo.usedCharacters ?? 0).toLocaleString(),
              total: (planInfo.monthlyCharacters ?? 0).toLocaleString(),
            })}
          </Text>
        </View>
      )}

      {/* Preview Button */}
      <View style={styles.previewContainer}>
        <TouchableOpacity
          style={[styles.previewButton, { borderColor: colors.primary }]}
          onPress={handlePreview}
          disabled={isDisabled}
        >
          <Ionicons
            name="volume-high-outline"
            size={18}
            color={isDisabled ? colors.textMuted : colors.primary}
          />
          <Text
            style={[styles.previewText, { color: isDisabled ? colors.textMuted : colors.primary }]}
          >
            {t('settings.audioCoach.preview')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  descriptionContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textColumn: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hint: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  chipDisabled: {
    opacity: 0.5,
  },
  rateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rateValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  voiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  tierBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  usageContainer: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  usageText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  previewContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  previewText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
});
