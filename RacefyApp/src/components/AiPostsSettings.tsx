import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { triggerHaptic } from '../hooks/useHaptics';
import { spacing, fontSize } from '../theme';
import type { AiPostsPreferences } from '../types/api';

interface AiPostsSettingsProps {
  preferences: AiPostsPreferences;
  onPreferenceChange: (key: string, value: any) => Promise<void>;
  isUpdating: boolean;
  embedded?: boolean;
}

export function AiPostsSettings({
  preferences,
  onPreferenceChange,
  isUpdating,
  embedded = false,
}: AiPostsSettingsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const handleToggle = async (key: string, value: boolean) => {
    triggerHaptic();
    await onPreferenceChange(key, value);
  };

  const handleStyleChange = async (style: 'achievement' | 'statistical' | 'comparison') => {
    triggerHaptic();
    await onPreferenceChange('ai_posts.default_style', style);
  };

  const isDisabled = !preferences.enabled || isUpdating;

  const containerStyle = embedded
    ? {}
    : [styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }];

  return (
    <View style={containerStyle}>
      {/* Header - only show when not embedded */}
      {!embedded && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('settings.aiPosts.title')}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t('settings.aiPosts.description')}
          </Text>
        </View>
      )}

      {/* Description when embedded */}
      {embedded && (
        <View style={styles.embeddedDescription}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t('settings.aiPosts.description')}
          </Text>
        </View>
      )}

      {/* Enable Toggle */}
      <View style={[styles.section, !embedded && { borderTopColor: colors.border }]}>
        <View style={styles.row}>
          <View style={styles.textColumn}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('settings.aiPosts.enable')}
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t('settings.aiPosts.enableDescription')}
            </Text>
          </View>
          <Switch
            value={preferences.enabled}
            onValueChange={(value) => handleToggle('ai_posts.enabled', value)}
            disabled={isUpdating}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={preferences.enabled ? colors.primary : colors.white}
          />
        </View>
      </View>

      {/* Style Selector */}
      <View style={[styles.section, { borderTopColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {t('settings.aiPosts.defaultStyle')}
        </Text>
        <View style={styles.buttonRow}>
          {(['achievement', 'statistical', 'comparison'] as const).map((style) => (
            <TouchableOpacity
              key={style}
              style={[
                styles.styleButton,
                {
                  backgroundColor:
                    preferences.default_style === style ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleStyleChange(style)}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.styleButtonText,
                  {
                    color:
                      preferences.default_style === style
                        ? colors.white
                        : colors.textSecondary,
                  },
                ]}
              >
                {t(`settings.aiPosts.styles.${style}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {t('settings.aiPosts.styleDescription')}
        </Text>
      </View>

      {/* Triggers */}
      <View style={[styles.section, { borderTopColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {t('settings.aiPosts.triggers')}
        </Text>
        {Object.entries(preferences.triggers).map(([key, value]) => {
          // Convert snake_case to camelCase for translation key
          const translationKey = key
            .split('_')
            .map((word, index) =>
              index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join('');

          return (
            <View key={key} style={styles.row}>
              <Text style={[styles.triggerLabel, { color: colors.textPrimary }]}>
                {t(`settings.aiPosts.trigger${translationKey.charAt(0).toUpperCase() + translationKey.slice(1)}`)}
              </Text>
              <Switch
                value={value}
                onValueChange={(v) => handleToggle(`ai_posts.triggers.${key}`, v)}
                disabled={isDisabled}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={value ? colors.primary : colors.white}
              />
            </View>
          );
        })}
      </View>

      {/* Auto-publish */}
      <View style={[styles.section, { borderTopColor: colors.border, borderBottomWidth: 0 }]}>
        <View style={styles.row}>
          <View style={styles.textColumn}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('settings.aiPosts.autoPublish')}
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t('settings.aiPosts.autoPublishDescription')}
            </Text>
          </View>
          <Switch
            value={preferences.auto_publish}
            onValueChange={(value) => handleToggle('ai_posts.auto_publish', value)}
            disabled={isDisabled}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={preferences.auto_publish ? colors.primary : colors.white}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  header: {
    padding: spacing.lg,
  },
  embeddedDescription: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  section: {
    borderTopWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  textColumn: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  styleButton: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  triggerLabel: {
    fontSize: fontSize.md,
    flex: 1,
  },
});
