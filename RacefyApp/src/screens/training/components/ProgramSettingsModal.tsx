import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { api } from '../../../services/api';
import { logger } from '../../../services/logger';
import { borderRadius, fontSize, spacing } from '../../../theme';
import type { SportTypeWithIcon } from '../../../hooks/useSportTypes';
import type { AiMode, MentalBudget, TrainingProgram } from '../../../types/api';
import { getErrorMessage } from '../../../utils/errors';

interface Props {
  visible: boolean;
  program: TrainingProgram;
  sportTypes: SportTypeWithIcon[];
  onClose: () => void;
  /** After a successful save — reload the programme. */
  onSaved: () => Promise<void>;
}

/**
 * Programme settings: auto-linking of activities, which other sports count as
 * cross-training, and how often training tips may arrive (mental budget).
 * The form starts from the programme every time it opens; nothing is written
 * until Save.
 */
export function ProgramSettingsModal({ visible, program, sportTypes, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [autoLinkActivities, setAutoLinkActivities] = useState(program.auto_link_activities);
  const [allowedSportTypes, setAllowedSportTypes] = useState<number[]>(
    program.allowed_sport_types || [],
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [mentalBudget, setMentalBudget] = useState<MentalBudget | null>(null);
  const [aiMode, setAiMode] = useState<AiMode>('reactive');
  const [loadingMentalBudget, setLoadingMentalBudget] = useState(false);

  // Every opening starts from what the programme has now.
  useEffect(() => {
    if (!visible) return;
    setAutoLinkActivities(program.auto_link_activities);
    setAllowedSportTypes(program.allowed_sport_types || []);
    let cancelled = false;
    setLoadingMentalBudget(true);
    api
      .getMentalBudget()
      .then((budget) => {
        if (cancelled) return;
        setMentalBudget(budget);
        setAiMode(budget.ai_mode);
        logger.info('training', 'Mental budget loaded', { budget });
      })
      .catch((err) => logger.error('training', 'Failed to load mental budget', { error: err }))
      .finally(() => {
        if (!cancelled) setLoadingMentalBudget(false);
      });
    return () => {
      cancelled = true;
    };
    // Re-read only when the sheet opens or another programme is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, program.id]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.updateProgramSettings(program.id, {
        auto_link_activities: autoLinkActivities,
        // null (not undefined, not []) is how "every sport counts" is expressed.
        // Sending undefined omits the field, which left the user unable to clear
        // a restriction once set; [] persists something that reads as a
        // restriction but enforces nothing.
        allowed_sport_types: allowedSportTypes.length > 0 ? allowedSportTypes : null,
      });
      logger.info('training', 'Program settings updated', {
        programId: program.id,
        autoLinkActivities,
        allowedSportTypes: allowedSportTypes.length,
      });

      if (mentalBudget && aiMode !== mentalBudget.ai_mode) {
        await api.updateMentalBudget({ ai_mode: aiMode });
        logger.info('training', 'Mental budget updated', { aiMode });
      }

      await onSaved();
      onClose();
      Alert.alert(t('common.success'), t('training.weeksList.settingsUpdated'));
    } catch (err) {
      logger.error('training', 'Failed to update settings', { error: err });
      Alert.alert(t('common.error'), getErrorMessage(err));
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScreenContainer style={styles.modalContainer}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            {t('training.weeksList.settings')}
          </Text>
          <TouchableOpacity onPress={handleSaveSettings} disabled={savingSettings}>
            {savingSettings ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.modalDoneText, { color: colors.primary }]}>
                {t('common.save')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Auto-Link Toggle */}
          <View style={styles.modalSection}>
            <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
              {t('training.weeksList.autoLinkTitle')}
            </Text>
            <TouchableOpacity
              style={[
                styles.modalToggleRow,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
                autoLinkActivities && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary + '15',
                },
              ]}
              onPress={() => setAutoLinkActivities(!autoLinkActivities)}
            >
              <View style={styles.modalToggleLabel}>
                <Ionicons
                  name={autoLinkActivities ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={autoLinkActivities ? colors.primary : colors.textSecondary}
                />
                <View style={styles.modalToggleContent}>
                  <Text style={[styles.modalToggleText, { color: colors.textPrimary }]}>
                    {t('training.calibration.autoLinkActivities')}
                  </Text>
                  <Text style={[styles.modalToggleDescription, { color: colors.textSecondary }]}>
                    {t('training.calibration.autoLinkActivitiesDescription')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Cross-Training Sports */}
          {autoLinkActivities && (
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                {t('training.calibration.crossTrainingSports')}
              </Text>
              <Text style={[styles.modalSectionDescription, { color: colors.textSecondary }]}>
                {t('training.calibration.crossTrainingSportsDescription')}
              </Text>
              {sportTypes
                .filter((s) => s.id !== program.sport_type_id)
                .map((sport) => {
                  const isSelected = allowedSportTypes.includes(sport.id);
                  return (
                    <TouchableOpacity
                      key={sport.id}
                      style={[
                        styles.modalSportRow,
                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        isSelected && {
                          borderColor: colors.primary,
                          backgroundColor: colors.primary + '15',
                        },
                      ]}
                      onPress={() => {
                        setAllowedSportTypes((prev) =>
                          isSelected ? prev.filter((id) => id !== sport.id) : [...prev, sport.id],
                        );
                      }}
                    >
                      <Ionicons
                        name={sport.icon || 'fitness-outline'}
                        size={24}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      <Text style={[styles.modalSportText, { color: colors.textPrimary }]}>
                        {sport.name}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </View>
          )}

          {/* Mental Budget / Training Tips Settings */}
          <View style={styles.modalSection}>
            <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
              {t('training.tips.settings.title')}
            </Text>
            <Text style={[styles.modalSectionDescription, { color: colors.textSecondary }]}>
              {t('training.tips.settings.frequency')}
            </Text>

            {loadingMentalBudget ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <>
                {(['silent', 'reactive', 'proactive'] as AiMode[]).map((mode) => {
                  const isSelected = aiMode === mode;
                  const modeIcons: Record<AiMode, string> = {
                    silent: 'volume-mute',
                    reactive: 'volume-medium',
                    proactive: 'volume-high',
                  };
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.modalSportRow,
                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        isSelected && {
                          borderColor: colors.primary,
                          backgroundColor: colors.primary + '15',
                        },
                      ]}
                      onPress={() => setAiMode(mode)}
                    >
                      <Ionicons
                        name={modeIcons[mode] as any}
                        size={24}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      <Text style={[styles.modalSportText, { color: colors.textPrimary }]}>
                        {t(`training.tips.settings.${mode}`)}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}

                {mentalBudget && (
                  <View style={[styles.usageContainer, { backgroundColor: colors.cardBackground }]}>
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                    <Text style={[styles.usageText, { color: colors.textSecondary }]}>
                      {t('training.tips.settings.usage', {
                        delivered: mentalBudget.tips_delivered_this_week,
                        max: mentalBudget.max_tips_per_week,
                      })}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </ScreenContainer>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  modalDoneText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalSection: {
    marginBottom: spacing.xxl,
  },
  modalSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  modalSectionDescription: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  modalToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  modalToggleLabel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    flex: 1,
  },
  modalToggleContent: {
    flex: 1,
  },
  modalToggleText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  modalToggleDescription: {
    fontSize: fontSize.sm,
  },
  modalSportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  modalSportText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  usageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  usageText: {
    flex: 1,
    fontSize: fontSize.sm,
  },
});
