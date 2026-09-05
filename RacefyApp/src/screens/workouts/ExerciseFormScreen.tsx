import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, ScreenContainer, ScreenHeader } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { emitRefresh } from '../../services/refreshEvents';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { MuscleGroup } from '../../types/workouts';
import { MUSCLE_GROUPS } from '../../types/workouts';

type Props = NativeStackScreenProps<RootStackParamList, 'ExerciseForm'>;

/** Create / edit a library exercise. Global rows are read-only here. */
export function ExerciseFormScreen({ navigation, route }: Props) {
  const exerciseId = route.params?.exerciseId;
  const isEdit = exerciseId != null;
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [name, setName] = useState('');
  const [group, setGroup] = useState<MuscleGroup>('other');
  const [equipment, setEquipment] = useState('');
  const [video, setVideo] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!isEdit) return;
    let mounted = true;
    api
      .getExercise(exerciseId)
      .then((ex) => {
        if (!mounted) return;
        setName(ex.name);
        setGroup(ex.muscle_group ?? 'other');
        setEquipment(ex.equipment ?? '');
        setVideo(ex.video_url ?? '');
        setDescription(ex.description ?? '');
        setReadOnly(ex.is_global);
      })
      .catch((error: any) => {
        logger.error('api', 'Failed to load exercise', { exerciseId, error: error.message });
        navigation.goBack();
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [isEdit, exerciseId, navigation]);

  const submit = async () => {
    setErrors({});
    if (!name.trim()) {
      setErrors({ name: [t('strengthPlans.errors.nameRequired')] });
      return;
    }
    const payload = {
      name: name.trim(),
      muscle_group: group,
      equipment: equipment.trim() || null,
      video_url: video.trim() || null,
      description: description.trim() || null,
    };
    setSubmitting(true);
    try {
      if (isEdit) await api.updateExercise(exerciseId, payload);
      else await api.createExercise(payload);
      emitRefresh('workouts');
      navigation.goBack();
    } catch (error: any) {
      if (error.status === 422) setErrors(error.errors || {});
      else Alert.alert('', error.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={['top']}>
      <ScreenHeader
        title={t(
          isEdit
            ? 'strengthPlans.exerciseLibForm.titleEdit'
            : 'strengthPlans.exerciseLibForm.titleNew',
        )}
        showBack
        onBack={() => navigation.goBack()}
      />
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {readOnly && (
              <Text style={[styles.readOnly, { color: colors.textSecondary }]}>
                {t('strengthPlans.exerciseLibForm.readOnly')}
              </Text>
            )}
            <Input
              label={t('strengthPlans.exerciseLibForm.name')}
              value={name}
              onChangeText={setName}
              error={errors.name}
              editable={!readOnly}
              maxLength={200}
            />

            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('strengthPlans.exerciseLibForm.muscleGroup')}
            </Text>
            <View style={styles.groups}>
              {MUSCLE_GROUPS.map((g) => {
                const active = group === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.groupChip,
                      {
                        backgroundColor: active ? colors.primary : colors.cardBackground,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => !readOnly && setGroup(g)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[styles.chipText, { color: active ? '#ffffff' : colors.textPrimary }]}
                    >
                      {t(`strengthPlans.muscleGroups.${g}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label={t('strengthPlans.exerciseLibForm.equipment')}
              value={equipment}
              onChangeText={setEquipment}
              placeholder={t('strengthPlans.exerciseLibForm.equipmentPlaceholder')}
              error={errors.equipment}
              editable={!readOnly}
            />
            <Input
              label={t('strengthPlans.exerciseLibForm.video')}
              value={video}
              onChangeText={setVideo}
              placeholder="https://youtu.be/…"
              keyboardType="url"
              autoCapitalize="none"
              error={errors.video_url}
              editable={!readOnly}
            />
            <Input
              label={t('strengthPlans.exerciseLibForm.description')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              error={errors.description}
              editable={!readOnly}
            />

            {!readOnly && (
              <Button
                title={t('strengthPlans.exerciseLibForm.save')}
                onPress={submit}
                loading={submitting}
                fullWidth
                style={{ marginTop: spacing.md }}
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.sm,
  },
  readOnly: {
    fontSize: fontSize.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  groups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  groupChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
