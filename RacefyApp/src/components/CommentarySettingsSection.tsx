import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks';
import { Card } from './Card';
import { Input } from './Input';
import { spacing, fontSize, borderRadius } from '../theme';
import type {
  CommentaryStyle,
  CommentaryLanguage,
} from '../types/api';

interface CommentarySettingsData {
  enabled: boolean;
  style: CommentaryStyle;
  token_limit: number | null;
  interval_minutes: number;
  auto_publish: boolean;
  languages: CommentaryLanguage[];
}

interface CommentarySettingsSectionProps {
  value: CommentarySettingsData;
  onChange: (settings: CommentarySettingsData) => void;
  disabled?: boolean;
}

const AVAILABLE_STYLES: Record<
  CommentaryStyle,
  { name: string; nameKey: string; descriptionKey: string }
> = {
  exciting: {
    name: 'Exciting',
    nameKey: 'commentary.styles.exciting.name',
    descriptionKey: 'commentary.styles.exciting.description',
  },
  professional: {
    name: 'Professional',
    nameKey: 'commentary.styles.professional.name',
    descriptionKey: 'commentary.styles.professional.description',
  },
  casual: {
    name: 'Casual',
    nameKey: 'commentary.styles.casual.name',
    descriptionKey: 'commentary.styles.casual.description',
  },
  humorous: {
    name: 'Humorous',
    nameKey: 'commentary.styles.humorous.name',
    descriptionKey: 'commentary.styles.humorous.description',
  },
  statistical: {
    name: 'Statistical',
    nameKey: 'commentary.styles.statistical.name',
    descriptionKey: 'commentary.styles.statistical.description',
  },
  motivational: {
    name: 'Motivational',
    nameKey: 'commentary.styles.motivational.name',
    descriptionKey: 'commentary.styles.motivational.description',
  },
};

const AVAILABLE_LANGUAGES: Record<CommentaryLanguage, { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇬🇧' },
  pl: { name: 'Polski', flag: '🇵🇱' },
};

const INTERVAL_OPTIONS = [5, 10, 15, 30, 60];

export function CommentarySettingsSection({
  value,
  onChange,
  disabled = false,
}: CommentarySettingsSectionProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const updateSetting = <K extends keyof CommentarySettingsData>(
    key: K,
    newValue: CommentarySettingsData[K]
  ) => {
    onChange({
      ...value,
      [key]: newValue,
    });
  };

  const toggleLanguage = (lang: CommentaryLanguage) => {
    const currentLanguages = value.languages || [];
    const newLanguages = currentLanguages.includes(lang)
      ? currentLanguages.filter((l) => l !== lang)
      : [...currentLanguages, lang];

    // Don't allow deselecting all languages
    if (newLanguages.length > 0) {
      updateSetting('languages', newLanguages);
    }
  };

  return (
    <>
      {/* Section Toggle */}
      <TouchableOpacity  // @ts-ignore

        style={styles.sectionToggle}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.toggleLeft}>
          <Ionicons
            name="mic-outline"
            size={24}
            color={value.enabled ? colors.primary : colors.textSecondary}
          />
          <View style={styles.toggleTextContainer}>
            <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
              {t('commentary.aiCommentary', 'AI Commentary')}
            </Text>
            <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
              {value.enabled
                ? t('commentary.enabled', 'Enabled')
                : t('commentary.disabled', 'Disabled')}
            </Text>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Expanded Settings */}
      {isExpanded && (
        <Card style={disabled ? [styles.settingsCard, { opacity: 0.6 }] : styles.settingsCard}>
          {/* Enable/Disable */}
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
              value={value.enabled}
              onValueChange={(enabled) => updateSetting('enabled', enabled)}
              disabled={disabled}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>

          {value.enabled && (
            <>
              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Style Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                  {t('commentary.style', 'Commentary Style')}
                </Text>
                <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
                  {t('commentary.styleHint', 'Choose the tone and style of commentary')}
                </Text>
                <View style={styles.styleGrid}>
                  {(Object.keys(AVAILABLE_STYLES) as CommentaryStyle[]).map((style) => {
                    const styleInfo = AVAILABLE_STYLES[style];
                    const isSelected = value.style === style;
                    return (
                      <TouchableOpacity
                        key={style}
                        style={[
                          styles.styleOption,
                          {
                            backgroundColor: isSelected
                              ? colors.successLight
                              : colors.transparent,
                            borderColor: isSelected ? colors.success : colors.border,
                          },
                        ]}
                        onPress={() => updateSetting('style', style)}
                        disabled={disabled}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.styleOptionName,
                            {
                              color: isSelected ? colors.success : colors.textPrimary,
                            },
                          ]}
                        >
                          {t(styleInfo.nameKey, styleInfo.name)}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Languages */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                  {t('commentary.languages', 'Languages')}
                </Text>
                <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
                  {t('commentary.languagesHint', 'Select languages for commentary generation')}
                </Text>
                <View style={styles.languageRow}>
                  {(Object.keys(AVAILABLE_LANGUAGES) as CommentaryLanguage[]).map((lang) => {
                    const langInfo = AVAILABLE_LANGUAGES[lang];
                    const isSelected = value.languages.includes(lang);
                    return (
                      <TouchableOpacity
                        key={lang}
                        style={[
                          styles.languageButton,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : colors.transparent,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => toggleLanguage(lang)}
                        disabled={disabled}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.languageFlag}>{langInfo.flag}</Text>
                        <Text
                          style={[
                            styles.languageName,
                            {
                              color: isSelected ? colors.white : colors.textPrimary,
                            },
                          ]}
                        >
                          {langInfo.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Update Interval */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                  {t('commentary.updateInterval', 'Update Interval')}
                </Text>
                <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
                  {t('commentary.intervalHint', 'How often to generate live updates during event')}
                </Text>
                <View style={styles.intervalRow}>
                  {INTERVAL_OPTIONS.map((interval) => {
                    const isSelected = value.interval_minutes === interval;
                    return (
                      <TouchableOpacity
                        key={interval}
                        style={[
                          styles.intervalButton,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : colors.transparent,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => updateSetting('interval_minutes', interval)}
                        disabled={disabled}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.intervalText,
                            {
                              color: isSelected ? colors.white : colors.textPrimary,
                            },
                          ]}
                        >
                          {interval} min
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Token Limit */}
              <View style={styles.section}>
                <Input
                  label={t('commentary.tokenLimit', 'Token Limit')}
                  placeholder={t('commentary.tokenLimitPlaceholder', 'Leave empty for unlimited')}
                  value={value.token_limit?.toString() || ''}
                  onChangeText={(text) => {
                    const num = parseInt(text, 10);
                    updateSetting('token_limit', text === '' ? null : isNaN(num) ? null : num);
                  }}
                  keyboardType="number-pad"
                  leftIcon="trending-up-outline"
                  editable={!disabled}
                />
                <Text style={[styles.hint, { color: colors.textMuted }]}>
                  {t(
                    'commentary.tokenLimitHint',
                    'Set a limit to control AI usage costs. Leave empty for unlimited.'
                  )}
                </Text>
              </View>

              {/* Auto-publish */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    {t('commentary.autoPublish', 'Auto-publish')}
                  </Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    {t(
                      'commentary.autoPublishDescription',
                      'Automatically publish generated commentary'
                    )}
                  </Text>
                </View>
                <Switch
                  value={value.auto_publish}
                  onValueChange={(autoPublish) => updateSetting('auto_publish', autoPublish)}
                  disabled={disabled}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.white}
                />
              </View>
            </>
          )}
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  toggleTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  toggleSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  settingsCard: {
    marginTop: 0,
    marginBottom: spacing.md,
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
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  section: {
    marginTop: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  styleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: '48%',
  },
  styleOptionName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  languageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flex: 1,
  },
  languageFlag: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  languageName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  intervalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  intervalButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  intervalText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  hint: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
});
