import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
  force_participants: boolean;
  time_windows: Array<{ start: string; end: string }>;
  days_of_week: number[];
  pause_summary_enabled: boolean;
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

const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6] as const;

export function CommentarySettingsSection({
  value,
  onChange,
  disabled = false,
}: CommentarySettingsSectionProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTimePicker, setActiveTimePicker] = useState<{
    windowIndex: number;
    field: 'start' | 'end';
  } | null>(null);

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

  const toggleDay = (day: number) => {
    const currentDays = value.days_of_week || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort();
    updateSetting('days_of_week', newDays);
  };

  const addTimeWindow = () => {
    const currentWindows = value.time_windows || [];
    updateSetting('time_windows', [...currentWindows, { start: '09:00', end: '21:00' }]);
  };

  const removeTimeWindow = (index: number) => {
    const currentWindows = value.time_windows || [];
    updateSetting('time_windows', currentWindows.filter((_, i) => i !== index));
  };

  const updateTimeWindow = (index: number, field: 'start' | 'end', text: string) => {
    const currentWindows = [...(value.time_windows || [])];
    currentWindows[index] = { ...currentWindows[index], [field]: text };
    updateSetting('time_windows', currentWindows);
  };

  // Parse "HH:MM" string to Date object for time picker
  const parseTimeString = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  };

  // Format Date to "HH:MM" string
  const formatTimeToString = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Handle time picker change
  const handleTimePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // On Android, close picker after selection
    if (Platform.OS === 'android') {
      setActiveTimePicker(null);
      if (event.type === 'set' && selectedDate && activeTimePicker) {
        const timeString = formatTimeToString(selectedDate);
        updateTimeWindow(activeTimePicker.windowIndex, activeTimePicker.field, timeString);
      }
      return;
    }

    // On iOS, update value continuously as user scrolls (modal has Done button to close)
    if (selectedDate && activeTimePicker) {
      const timeString = formatTimeToString(selectedDate);
      updateTimeWindow(activeTimePicker.windowIndex, activeTimePicker.field, timeString);
    }
  };

  // Open time picker for a specific window and field
  const openTimePicker = (windowIndex: number, field: 'start' | 'end') => {
    if (!disabled) {
      setActiveTimePicker({ windowIndex, field });
    }
  };

  // Get current time value for picker
  const getTimePickerValue = (): Date => {
    if (!activeTimePicker) return new Date();
    const window = (value.time_windows || [])[activeTimePicker.windowIndex];
    if (!window) return new Date();
    const timeStr = activeTimePicker.field === 'start' ? window.start : window.end;
    return parseTimeString(timeStr);
  };

  const getDayLabel = (day: number): string => {
    const keys = ['days.sun', 'days.mon', 'days.tue', 'days.wed', 'days.thu', 'days.fri', 'days.sat'];
    return t(`commentary.${keys[day]}`, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]);
  };

  const hasScheduleConfig = (value.time_windows && value.time_windows.length > 0) || (value.days_of_week && value.days_of_week.length > 0);

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

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Force Participants */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    {t('commentary.forceParticipants', 'Force Participants')}
                  </Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    {t(
                      'commentary.forceParticipantsDescription',
                      'Override participant AI preferences for this event'
                    )}
                  </Text>
                </View>
                <Switch
                  value={value.force_participants}
                  onValueChange={(force) => updateSetting('force_participants', force)}
                  disabled={disabled}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.white}
                />
              </View>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Advanced Settings Toggle */}
              <TouchableOpacity
                style={styles.advancedToggle}
                onPress={() => setShowAdvanced(!showAdvanced)}
                activeOpacity={0.7}
              >
                <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                  {t('commentary.advancedSettings', 'Advanced Settings')}
                </Text>
                <Ionicons
                  name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {showAdvanced && (
                <>
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

                  {/* Divider */}
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  {/* Time Windows */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                      {t('commentary.timeWindows', 'Time Windows')}
                    </Text>
                    <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
                      {t('commentary.timeWindowsHint', 'Restrict commentary to specific hours. Leave empty for always active.')}
                    </Text>
                    {(value.time_windows || []).map((window, index) => (
                      <View key={index} style={styles.timeWindowRow}>
                        <TouchableOpacity
                          style={[
                            styles.timeButton,
                            { backgroundColor: colors.cardBackground, borderColor: colors.border },
                          ]}
                          onPress={() => openTimePicker(index, 'start')}
                          disabled={disabled}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                          <Text style={[styles.timeButtonText, { color: colors.textPrimary }]}>
                            {window.start || '09:00'}
                          </Text>
                        </TouchableOpacity>
                        <Text style={[styles.timeWindowSeparator, { color: colors.textSecondary }]}>–</Text>
                        <TouchableOpacity
                          style={[
                            styles.timeButton,
                            { backgroundColor: colors.cardBackground, borderColor: colors.border },
                          ]}
                          onPress={() => openTimePicker(index, 'end')}
                          disabled={disabled}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                          <Text style={[styles.timeButtonText, { color: colors.textPrimary }]}>
                            {window.end || '21:00'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeTimeWindow(index)}
                          disabled={disabled}
                          style={styles.removeButton}
                        >
                          <Ionicons name="close-circle" size={22} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity
                      style={[styles.addButton, { borderColor: colors.border }]}
                      onPress={addTimeWindow}
                      disabled={disabled}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                      <Text style={[styles.addButtonText, { color: colors.primary }]}>
                        {t('commentary.addTimeWindow', 'Add Time Window')}
                      </Text>
                    </TouchableOpacity>

                    {/* Time Picker Modal */}
                    {activeTimePicker && Platform.OS === 'android' && (
                      <DateTimePicker
                        value={getTimePickerValue()}
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={handleTimePickerChange}
                      />
                    )}
                    {activeTimePicker && Platform.OS === 'ios' && (
                      <Modal
                        transparent
                        animationType="slide"
                        visible={true}
                        onRequestClose={() => setActiveTimePicker(null)}
                      >
                        <View style={styles.timePickerModalOverlay}>
                          <View style={[styles.timePickerModalContent, { backgroundColor: colors.cardBackground }]}>
                            <View style={[styles.timePickerModalHeader, { borderBottomColor: colors.border }]}>
                              <TouchableOpacity onPress={() => setActiveTimePicker(null)}>
                                <Text style={[styles.timePickerModalCancel, { color: colors.textSecondary }]}>
                                  {t('common.cancel', 'Cancel')}
                                </Text>
                              </TouchableOpacity>
                              <Text style={[styles.timePickerModalTitle, { color: colors.textPrimary }]}>
                                {activeTimePicker.field === 'start'
                                  ? t('commentary.timeWindowStart', 'Start')
                                  : t('commentary.timeWindowEnd', 'End')}
                              </Text>
                              <TouchableOpacity onPress={() => setActiveTimePicker(null)}>
                                <Text style={[styles.timePickerModalDone, { color: colors.primary }]}>
                                  {t('common.done', 'Done')}
                                </Text>
                              </TouchableOpacity>
                            </View>
                            <DateTimePicker
                              value={getTimePickerValue()}
                              mode="time"
                              is24Hour={true}
                              display="spinner"
                              onChange={handleTimePickerChange}
                              style={styles.iosTimePicker}
                            />
                          </View>
                        </View>
                      </Modal>
                    )}
                  </View>

                  {/* Divider */}
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  {/* Days of Week */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                      {t('commentary.daysOfWeek', 'Days of Week')}
                    </Text>
                    <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
                      {t('commentary.daysOfWeekHint', 'Select active days. Leave empty for all days.')}
                    </Text>
                    <View style={styles.daysRow}>
                      {DAYS_OF_WEEK.map((day) => {
                        const isSelected = (value.days_of_week || []).includes(day);
                        return (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.dayChip,
                              {
                                backgroundColor: isSelected ? colors.primary : colors.transparent,
                                borderColor: isSelected ? colors.primary : colors.border,
                              },
                            ]}
                            onPress={() => toggleDay(day)}
                            disabled={disabled}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.dayChipText,
                                { color: isSelected ? colors.white : colors.textPrimary },
                              ]}
                            >
                              {getDayLabel(day)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Pause Summary (only shown when schedule is configured) */}
                  {hasScheduleConfig && (
                    <>
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                          <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                            {t('commentary.pauseSummary', 'Pause Summary')}
                          </Text>
                          <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                            {t(
                              'commentary.pauseSummaryDescription',
                              'Generate a summary when commentary pauses'
                            )}
                          </Text>
                        </View>
                        <Switch
                          value={value.pause_summary_enabled}
                          onValueChange={(enabled) => updateSetting('pause_summary_enabled', enabled)}
                          disabled={disabled}
                          trackColor={{ true: colors.primary, false: colors.border }}
                          thumbColor={colors.white}
                        />
                      </View>
                    </>
                  )}
                </>
              )}
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
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  timeWindowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  timeInput: {
    flex: 1,
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  timeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  timeWindowSeparator: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  removeButton: {
    padding: spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: spacing.xs,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    minWidth: 40,
    alignItems: 'center',
  },
  dayChipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  // iOS Time Picker Modal styles
  timePickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  timePickerModalContent: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: spacing.xl,
  },
  timePickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  timePickerModalTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  timePickerModalCancel: {
    fontSize: fontSize.md,
  },
  timePickerModalDone: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  iosTimePicker: {
    height: 200,
  },
});
