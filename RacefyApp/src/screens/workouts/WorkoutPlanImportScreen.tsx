import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, ScreenContainer, ScreenHeader } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { emitRefresh } from '../../services/refreshEvents';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { WorkoutPlanImportPreview } from '../../types/workouts';
import { formatPrescription, weekdayShort } from '../../utils/workoutPlanFormat';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutPlanImport'>;

const MAX_BYTES = 5 * 1024 * 1024;
const XLSX_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

/**
 * Pick an .xlsx → dry-run parse on the API → review (summary, warnings,
 * which exercises are new) → save with the normal create endpoint.
 */
export function WorkoutPlanImportScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<WorkoutPlanImportPreview | null>(null);
  const [name, setName] = useState('');
  const [warningsOpen, setWarningsOpen] = useState(false);

  const pick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: XLSX_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      if (file.size != null && file.size > MAX_BYTES) {
        Alert.alert('', t('strengthPlans.import.fileTooLarge'));
        return;
      }
      setParsing(true);
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name ?? 'plan.xlsx',
        type: file.mimeType ?? XLSX_TYPES[0],
      } as any);
      const parsed = await api.importWorkoutPlanPreview(formData);
      setPreview(parsed);
      setName(parsed.data.name);
      setWarningsOpen(parsed.warnings.length > 0 && parsed.warnings.length <= 5);
    } catch (error: any) {
      logger.error('api', 'Workout plan import preview failed', { error: error.message });
      const detail = error.errors?.file?.[0] ?? error.message;
      Alert.alert(t('strengthPlans.import.failed'), detail || '');
    } finally {
      setParsing(false);
    }
  };

  const save = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const plan = await api.createWorkoutPlan({
        ...preview.data,
        name: name.trim() || preview.data.name,
      });
      emitRefresh('workouts');
      navigation.replace('WorkoutPlanDetail', { planId: plan.id });
    } catch (error: any) {
      const first = error.errors ? Object.values<string[]>(error.errors)[0]?.[0] : undefined;
      Alert.alert('', first || error.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer edges={['top']}>
      <ScreenHeader
        title={t('strengthPlans.import.title')}
        showBack
        onBack={() => navigation.goBack()}
      />

      {!preview ? (
        <View style={styles.intro}>
          <Ionicons name="cloud-upload-outline" size={56} color={colors.textMuted} />
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            {t('strengthPlans.import.intro')}
          </Text>
          {parsing ? (
            <View style={styles.parsing}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.introText, { color: colors.textMuted }]}>
                {t('strengthPlans.import.parsing')}
              </Text>
            </View>
          ) : (
            <Button title={t('strengthPlans.import.pick')} onPress={pick} fullWidth />
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Input
            label={t('strengthPlans.import.planName')}
            value={name}
            onChangeText={setName}
            maxLength={200}
          />
          <View style={[styles.summary, { backgroundColor: colors.primary + '1A' }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
              {t('strengthPlans.import.summary', {
                workouts: preview.summary.workouts,
                exercises: preview.summary.exercises,
                newExercises: preview.summary.new_exercises,
                scheduled: preview.summary.scheduled_workouts,
              })}
            </Text>
          </View>

          {preview.warnings.length > 0 && (
            <View
              style={[
                styles.warnings,
                { backgroundColor: colors.warningLight, borderColor: colors.warning },
              ]}
            >
              <TouchableOpacity
                style={styles.warningsHeader}
                onPress={() => setWarningsOpen((v) => !v)}
                activeOpacity={0.8}
              >
                <Ionicons name="warning-outline" size={18} color={colors.warning} />
                <Text style={[styles.warningsTitle, { color: colors.textPrimary }]}>
                  {t('strengthPlans.import.warnings', { count: preview.warnings.length })}
                </Text>
                <Ionicons
                  name={warningsOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {warningsOpen &&
                preview.warnings.map((w, i) => (
                  <Text key={i} style={[styles.warningRow, { color: colors.textSecondary }]}>
                    {t('strengthPlans.import.warningRow', w)}
                  </Text>
                ))}
            </View>
          )}

          {preview.data.workouts.map((w, wi) => (
            <View
              key={wi}
              style={[
                styles.workout,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
            >
              <View style={styles.workoutHeader}>
                <View style={[styles.dayBadge, { backgroundColor: colors.background }]}>
                  <Text style={[styles.dayBadgeText, { color: colors.textSecondary }]}>
                    {w.weekday ? weekdayShort(w.weekday, t) : '—'}
                  </Text>
                </View>
                <Text style={[styles.workoutName, { color: colors.textPrimary }]} numberOfLines={2}>
                  {w.day_label ? `${w.day_label} · ` : ''}
                  {w.name}
                </Text>
              </View>
              {w.exercises.map((row, ri) => (
                <View key={ri} style={styles.exerciseRow}>
                  <Text style={[styles.exerciseIndex, { color: colors.textMuted }]}>{ri + 1}.</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.exerciseName, { color: colors.textPrimary }]}
                      numberOfLines={2}
                    >
                      {row.exercise.name}
                    </Text>
                    <Text style={[styles.prescription, { color: colors.textSecondary }]}>
                      {formatPrescription(row, t)}
                      {row.load_note ? ` · ${row.load_note}` : ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.matchPill,
                      {
                        backgroundColor:
                          row.exercise.match === 'new'
                            ? colors.warning + '22'
                            : colors.primary + '22',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.matchText,
                        { color: row.exercise.match === 'new' ? colors.warning : colors.primary },
                      ]}
                    >
                      {t(
                        row.exercise.match === 'new'
                          ? 'strengthPlans.import.matchNew'
                          : 'strengthPlans.import.matchExisting',
                      )}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))}

          <Button
            title={saving ? t('strengthPlans.import.saving') : t('strengthPlans.import.save')}
            onPress={save}
            loading={saving}
            fullWidth
          />
          <Button
            title={t('strengthPlans.import.pickAnother')}
            variant="ghost"
            onPress={() => setPreview(null)}
            fullWidth
          />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  introText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  parsing: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.sm,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.lg,
  },
  summaryText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  warnings: {
    padding: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  warningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  warningsTitle: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  warningRow: {
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  workout: {
    padding: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  workoutName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exerciseIndex: {
    width: 22,
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  exerciseName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  prescription: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  matchPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  matchText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
