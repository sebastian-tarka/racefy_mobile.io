import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '../../hooks/useTheme';
import { useSportTypes } from '../../hooks/useSportTypes';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { spacing, fontSize, borderRadius } from '../../theme';
import { ScreenHeader, Button, Loading, Input, SportTypeSelector } from '../../components';
import type { RootStackParamList } from '../../navigation/types';
import type { ExperienceLevel, GuidanceLevel, RecoveryProfile, TrainingGoal } from '../../types/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: NavigationProp;
}

const EXPERIENCE_LEVELS: Array<{ value: ExperienceLevel; label: string; description: string }> = [
  { value: 'beginner', label: 'Beginner', description: 'New to running' },
  { value: 'recreational', label: 'Recreational', description: 'Run occasionally' },
  { value: 'regular', label: 'Regular', description: 'Consistent training' },
];

const GUIDANCE_LEVELS: Array<{ value: GuidanceLevel; label: string; description: string }> = [
  { value: 'minimal', label: 'Minimal', description: 'Basic guidance' },
  { value: 'standard', label: 'Standard', description: 'Regular coaching' },
  { value: 'coach_like', label: 'Coach-Like', description: 'Detailed coaching' },
];

const RECOVERY_PROFILES: Array<{ value: RecoveryProfile; label: string; description: string }> = [
  { value: 'low', label: 'Low', description: 'Quick recovery' },
  { value: 'medium', label: 'Medium', description: 'Average recovery' },
  { value: 'high', label: 'High', description: 'Need more rest' },
];

export function CalibrationFormScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { sportTypes } = useSportTypes();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [sportTypeId, setSportTypeId] = useState<number | null>(null);
  const [trainingGoals, setTrainingGoals] = useState<TrainingGoal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<TrainingGoal | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3); // Default to 3 sessions/week
  const [guidanceLevel, setGuidanceLevel] = useState<GuidanceLevel | null>(null);
  const [recoveryProfile, setRecoveryProfile] = useState<RecoveryProfile | null>(null);
  const [injuryHistory, setInjuryHistory] = useState(false);
  const [targetDistance, setTargetDistance] = useState('');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Activity linking state
  const [autoLinkActivities, setAutoLinkActivities] = useState(true);
  const [allowedSportTypes, setAllowedSportTypes] = useState<number[]>([]);
  const [showCrossTrainingModal, setShowCrossTrainingModal] = useState(false);

  // Cross-training sport types (excludes selected primary sport)
  const crossTrainingSports = sportTypes.filter(s => s.id !== sportTypeId);

  // Load training goals when sport type changes
  useEffect(() => {
    if (!sportTypeId) {
      setTrainingGoals([]);
      setSelectedGoal(null);
      setAllowedSportTypes([]);
      return;
    }
    // Clear cross-training selections when primary sport changes
    setAllowedSportTypes([]);

    const loadGoals = async () => {
      setLoadingGoals(true);
      try {
        const goals = await api.getTrainingGoals(sportTypeId);
        setTrainingGoals(goals);
        logger.info('training', 'Loaded training goals', { sportTypeId, count: goals.length });
      } catch (error: any) {
        logger.error('training', 'Failed to load training goals', { error });
        setErrors({ submit: error.message || t('training.errors.loadGoalsFailed') });
      } finally {
        setLoadingGoals(false);
      }
    };

    loadGoals();
  }, [sportTypeId, t]);

  // Auto-populate target date when goal is selected
  useEffect(() => {
    if (selectedGoal?.requires_target_date && selectedGoal.default_duration_weeks) {
      // Calculate suggested date: today + default_duration_weeks
      const suggestedDate = new Date();
      suggestedDate.setDate(suggestedDate.getDate() + (selectedGoal.default_duration_weeks * 7));
      setTargetDate(suggestedDate);
      logger.info('training', 'Auto-populated target date', {
        goalId: selectedGoal.id,
        defaultDurationWeeks: selectedGoal.default_duration_weeks,
        suggestedDate: suggestedDate.toISOString(),
      });
    }
  }, [selectedGoal]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!sportTypeId) {
      newErrors.sportTypeId = t('training.errors.sportTypeRequired');
    }
    if (!selectedGoal) {
      newErrors.trainingGoal = t('training.errors.trainingGoalRequired');
    }
    if (!experienceLevel) {
      newErrors.experienceLevel = t('training.errors.experienceLevelRequired');
    }
    if (!guidanceLevel) {
      newErrors.guidanceLevel = t('training.errors.guidanceLevelRequired');
    }
    if (!recoveryProfile) {
      newErrors.recoveryProfile = t('training.errors.recoveryProfileRequired');
    }
    if (selectedGoal?.requires_target_distance && !targetDistance) {
      newErrors.targetDistance = t('training.errors.targetDistanceRequired');
    }
    if (selectedGoal?.requires_target_date && !targetDate) {
      newErrors.targetDate = t('training.errors.targetDateRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    // Check if user already has an active program
    setLoading(true);
    try {
      const existingProgram = await api.getCurrentProgram();

      logger.debug('training', 'Existing program check', {
        hasProgram: !!existingProgram,
        status: existingProgram?.status,
        id: existingProgram?.id,
      });

      if (existingProgram) {
        setLoading(false);
        // Show confirmation dialog
        Alert.alert(
          t('training.calibration.existingProgramTitle'),
          t('training.calibration.existingProgramMessage'),
          [
            {
              text: t('common.cancel'),
              style: 'cancel',
            },
            {
              text: t('training.calibration.viewExisting'),
              onPress: () => navigation.replace('TrainingWeeksList'),
            },
            {
              text: t('training.calibration.replaceProgram'),
              style: 'destructive',
              onPress: () => createNewProgram(existingProgram.id),
            },
          ]
        );
        return;
      }

      logger.info('training', 'No existing program found, proceeding with creation');
      // No active program, proceed normally
      await createNewProgram();
    } catch (error: any) {
      logger.error('training', 'Failed to check existing program', { error });
      setErrors({ submit: t('training.errors.checkProgramFailed') });
      setLoading(false);
    }
  };

  const createNewProgram = async (abandonProgramId?: number) => {
    setLoading(true);
    try {
      // If there's a program to abandon, abandon it first
      if (abandonProgramId) {
        await api.abandonProgram(abandonProgramId);
        logger.info('training', 'Abandoned existing program', { programId: abandonProgramId });
      }

      // Create calibration
      const calibration = await api.createCalibration({
        sport_type_id: sportTypeId!,
        training_goal_id: selectedGoal!.id,
        experience_level: experienceLevel!,
        sessions_per_week: sessionsPerWeek,
        guidance_level: guidanceLevel!,
        recovery_profile: recoveryProfile!,
        injury_history: injuryHistory,
        target_distance: selectedGoal!.requires_target_distance && targetDistance ? parseInt(targetDistance) : undefined,
        target_date: selectedGoal!.requires_target_date && targetDate ? targetDate.toISOString().split('T')[0] : undefined,
      });

      logger.info('training', 'Calibration created', { calibrationId: calibration.id });

      // Initialize program with activity linking settings
      const program = await api.initProgram({
        auto_link_activities: autoLinkActivities,
        ...(autoLinkActivities && allowedSportTypes.length > 0
          ? { allowed_sport_types: allowedSportTypes }
          : {}),
      });

      logger.info('training', 'Program initialized', {
        programId: program.id,
        status: program.status,
        autoLinkActivities,
        allowedSportTypes: allowedSportTypes.length > 0 ? allowedSportTypes : 'none',
      });

      // Navigate to loading screen with program ID
      navigation.replace('ProgramLoading', { programId: program.id });
    } catch (error: any) {
      logger.error('training', 'Failed to create calibration', { error });
      setErrors({ submit: error.message || t('training.errors.creationFailed') });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading fullScreen message={t('training.creatingProgram')} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('training.calibration.title')}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Sport Type */}
        <SportTypeSelector
          value={sportTypeId}
          onChange={setSportTypeId}
          error={errors.sportTypeId}
        />

        {/* Training Goals (dynamic based on sport) */}
        {sportTypeId && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
              {t('training.calibration.trainingGoal')}
            </Text>
            {loadingGoals ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  {t('training.calibration.loadingGoals')}
                </Text>
              </View>
            ) : (
              <View style={styles.optionsList}>
                {trainingGoals.map((goal) => (
                  <TouchableOpacity
                    key={goal.id}
                    style={[
                      styles.listOption,
                      { backgroundColor: colors.cardBackground, borderColor: colors.border },
                      selectedGoal?.id === goal.id && {
                        borderColor: colors.primary,
                        backgroundColor: colors.primary + '15',
                      },
                    ]}
                    onPress={() => setSelectedGoal(goal)}
                  >
                    <View style={styles.listOptionContent}>
                      <Text style={[styles.listOptionLabel, { color: colors.textPrimary }]}>
                        {goal.name}
                      </Text>
                      <Text style={[styles.listOptionDescription, { color: colors.textSecondary }]}>
                        {goal.description}
                      </Text>
                    </View>
                    {selectedGoal?.id === goal.id && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {errors.trainingGoal && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.trainingGoal}</Text>
            )}
          </View>
        )}

        {/* Experience Level */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
            {t('training.calibration.experienceLevel')}
          </Text>
          <View style={styles.optionsList}>
            {EXPERIENCE_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.listOption,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  experienceLevel === level.value && {
                    borderColor: colors.primary,
                    backgroundColor: colors.primary + '15',
                  },
                ]}
                onPress={() => setExperienceLevel(level.value)}
              >
                <View style={styles.listOptionContent}>
                  <Text style={[styles.listOptionLabel, { color: colors.textPrimary }]}>
                    {level.label}
                  </Text>
                  <Text style={[styles.listOptionDescription, { color: colors.textSecondary }]}>
                    {level.description}
                  </Text>
                </View>
                {experienceLevel === level.value && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          {errors.experienceLevel && (
            <Text style={[styles.errorText, { color: colors.error }]}>{errors.experienceLevel}</Text>
          )}
        </View>

        {/* Sessions Per Week */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
            {t('training.calibration.sessionsPerWeek')}
          </Text>
          <View style={[styles.sliderContainer, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.frequencyValue, { color: colors.primary }]}>
              {sessionsPerWeek} {t('training.calibration.sessionsPerWeekLabel')}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={7}
              step={1}
              value={sessionsPerWeek}
              onValueChange={setSessionsPerWeek}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <View style={styles.sliderLabels}>
              <Text style={[styles.sliderLabel, { color: colors.textMuted }]}>1</Text>
              <Text style={[styles.sliderLabel, { color: colors.textMuted }]}>7</Text>
            </View>
          </View>
        </View>

        {/* Guidance Level */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
            {t('training.calibration.guidanceLevel')}
          </Text>
          <View style={styles.optionsList}>
            {GUIDANCE_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.listOption,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  guidanceLevel === level.value && {
                    borderColor: colors.primary,
                    backgroundColor: colors.primary + '15',
                  },
                ]}
                onPress={() => setGuidanceLevel(level.value)}
              >
                <View style={styles.listOptionContent}>
                  <Text style={[styles.listOptionLabel, { color: colors.textPrimary }]}>
                    {level.label}
                  </Text>
                  <Text style={[styles.listOptionDescription, { color: colors.textSecondary }]}>
                    {level.description}
                  </Text>
                </View>
                {guidanceLevel === level.value && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          {errors.guidanceLevel && (
            <Text style={[styles.errorText, { color: colors.error }]}>{errors.guidanceLevel}</Text>
          )}
        </View>

        {/* Recovery Profile */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
            {t('training.calibration.recoveryProfile')}
          </Text>
          <View style={styles.optionsList}>
            {RECOVERY_PROFILES.map((profile) => (
              <TouchableOpacity
                key={profile.value}
                style={[
                  styles.listOption,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  recoveryProfile === profile.value && {
                    borderColor: colors.primary,
                    backgroundColor: colors.primary + '15',
                  },
                ]}
                onPress={() => setRecoveryProfile(profile.value)}
              >
                <View style={styles.listOptionContent}>
                  <Text style={[styles.listOptionLabel, { color: colors.textPrimary }]}>
                    {profile.label}
                  </Text>
                  <Text style={[styles.listOptionDescription, { color: colors.textSecondary }]}>
                    {profile.description}
                  </Text>
                </View>
                {recoveryProfile === profile.value && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          {errors.recoveryProfile && (
            <Text style={[styles.errorText, { color: colors.error }]}>{errors.recoveryProfile}</Text>
          )}
        </View>

        {/* Injury History */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.checkboxContainer,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
            onPress={() => setInjuryHistory(!injuryHistory)}
          >
            <Ionicons
              name={injuryHistory ? 'checkbox' : 'square-outline'}
              size={24}
              color={injuryHistory ? colors.primary : colors.textSecondary}
            />
            <View style={styles.checkboxContent}>
              <Text style={[styles.checkboxLabel, { color: colors.textPrimary }]}>
                {t('training.calibration.injuryHistory')}
              </Text>
              <Text style={[styles.checkboxDescription, { color: colors.textSecondary }]}>
                {t('training.calibration.injuryHistoryDescription')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Auto-Link Activities */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.checkboxContainer,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
              autoLinkActivities && {
                borderColor: colors.primary,
                backgroundColor: colors.primary + '15',
              },
            ]}
            onPress={() => setAutoLinkActivities(!autoLinkActivities)}
          >
            <Ionicons
              name={autoLinkActivities ? 'checkbox' : 'square-outline'}
              size={24}
              color={autoLinkActivities ? colors.primary : colors.textSecondary}
            />
            <View style={styles.checkboxContent}>
              <Text style={[styles.checkboxLabel, { color: colors.textPrimary }]}>
                {t('training.calibration.autoLinkActivities')}
              </Text>
              <Text style={[styles.checkboxDescription, { color: colors.textSecondary }]}>
                {t('training.calibration.autoLinkActivitiesDescription')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Cross-Training Sports (only when auto-link is on) */}
        {autoLinkActivities && sportTypeId && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
              {t('training.calibration.crossTrainingSports')}
            </Text>
            <Text style={[styles.crossTrainingDescription, { color: colors.textSecondary }]}>
              {t('training.calibration.crossTrainingSportsDescription')}
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
              onPress={() => setShowCrossTrainingModal(true)}
            >
              <Ionicons name="fitness-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.dateText, {
                color: allowedSportTypes.length > 0 ? colors.textPrimary : colors.textMuted,
              }]}>
                {allowedSportTypes.length > 0
                  ? t('training.calibration.crossTrainingSelected', { count: allowedSportTypes.length })
                  : t('training.calibration.primarySportOnly')}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Conditional: Target Distance (if goal requires it) */}
        {selectedGoal?.requires_target_distance && (
          <View style={styles.section}>
            <Input
              label={t('training.calibration.targetDistance')}
              placeholder={t('training.calibration.targetDistancePlaceholder')}
              value={targetDistance}
              onChangeText={setTargetDistance}
              keyboardType="numeric"
              leftIcon="flag"
              error={errors.targetDistance}
            />
          </View>
        )}

        {/* Conditional: Target Date (if goal requires it) */}
        {selectedGoal?.requires_target_date && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
              {t('training.calibration.targetDate')}
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
                errors.targetDate && { borderColor: colors.error },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: targetDate ? colors.textPrimary : colors.textMuted }]}>
                {targetDate
                  ? targetDate.toLocaleDateString()
                  : t('training.calibration.selectDate')}
              </Text>
            </TouchableOpacity>
            {selectedGoal.default_duration_weeks && !errors.targetDate && (
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                {t('training.calibration.suggestedDate', { weeks: selectedGoal.default_duration_weeks })}
              </Text>
            )}
            {errors.targetDate && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.targetDate}</Text>
            )}
          </View>
        )}

        {/* Error message */}
        {errors.submit && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '15' }]}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={[styles.errorMessage, { color: colors.error }]}>{errors.submit}</Text>
          </View>
        )}

        {/* Submit Button */}
        <Button
          title={t('training.calibration.createProgram')}
          onPress={handleSubmit}
          disabled={loading}
          loading={loading}
          fullWidth
        />

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={targetDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setTargetDate(selectedDate);
            }
          }}
        />
      )}

      {/* Cross-Training Sport Picker Modal */}
      <Modal
        visible={showCrossTrainingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCrossTrainingModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCrossTrainingModal(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t('training.calibration.selectCrossTrainingSports')}
            </Text>
            <TouchableOpacity onPress={() => setShowCrossTrainingModal(false)}>
              <Text style={[styles.modalDoneText, { color: colors.primary }]}>
                {t('common.done')}
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={crossTrainingSports}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => {
              const isSelected = allowedSportTypes.includes(item.id);
              return (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    { backgroundColor: colors.cardBackground, borderColor: colors.border },
                    isSelected && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '15',
                    },
                  ]}
                  onPress={() => {
                    setAllowedSportTypes(prev =>
                      isSelected
                        ? prev.filter(id => id !== item.id)
                        : [...prev, item.id]
                    );
                  }}
                >
                  <Ionicons
                    name={item.icon || 'fitness-outline'}
                    size={24}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.modalItemText, { color: colors.textPrimary }]}>
                    {item.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  optionCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  optionsList: {
    gap: spacing.sm,
  },
  listOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  listOptionContent: {
    flex: 1,
  },
  listOptionLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  listOptionDescription: {
    fontSize: fontSize.sm,
  },
  sliderContainer: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  frequencyValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sliderLabel: {
    fontSize: fontSize.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  dateText: {
    fontSize: fontSize.md,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  checkboxContent: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  checkboxDescription: {
    fontSize: fontSize.sm,
  },
  hintText: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  errorMessage: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  crossTrainingDescription: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
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
  modalList: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    gap: spacing.md,
  },
  modalItemText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});
