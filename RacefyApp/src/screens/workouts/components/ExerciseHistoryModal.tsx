import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import type { ExerciseHistoryEntry } from '../../../types/workouts';
import { borderRadius, fontSize, spacing } from '../../../theme';

interface Props {
  exerciseId: number | null;
  exerciseName: string;
  onClose: () => void;
}

/** Last sessions of one exercise: date, workout, best weight, every set. */
export function ExerciseHistoryModal({ exerciseId, exerciseName, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [entries, setEntries] = useState<ExerciseHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (exerciseId == null) return;
    let cancelled = false;
    setLoading(true);
    api
      .getExerciseHistory(exerciseId)
      .then((data) => !cancelled && setEntries(data))
      .catch((error: any) =>
        logger.warn('api', 'Exercise history failed', { exerciseId, error: error.message }),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  return (
    <Modal
      visible={exerciseId != null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScreenContainer>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {exerciseName}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t('strengthPlans.history.title')}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {loading && <ActivityIndicator color={colors.primary} />}
          {!loading && entries.length === 0 && (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              {t('strengthPlans.history.empty')}
            </Text>
          )}
          {entries.map((e) => (
            <View
              key={e.session_id}
              style={[
                styles.card,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.date, { color: colors.textPrimary }]}>
                  {new Date(e.date).toLocaleDateString(i18n.language, {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
                <Text style={[styles.workout, { color: colors.textMuted }]} numberOfLines={1}>
                  {e.workout_name}
                </Text>
                {e.best_weight_kg != null && (
                  <Text style={[styles.best, { color: colors.primary }]}>
                    {t('strengthPlans.history.best', { kg: e.best_weight_kg })}
                  </Text>
                )}
              </View>
              <View style={styles.sets}>
                {e.sets.map((s) => (
                  <View
                    key={s.set_number}
                    style={[styles.setChip, { backgroundColor: colors.background }]}
                  >
                    <Text style={[styles.setText, { color: colors.textPrimary }]}>
                      {s.duration_seconds != null && s.reps == null
                        ? t('strengthPlans.history.setLineSeconds', { seconds: s.duration_seconds })
                        : t('strengthPlans.history.setLine', {
                            reps: s.reps ?? '—',
                            kg: s.weight_kg ?? 0,
                          })}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.volume, { color: colors.textMuted }]}>
                {t('strengthPlans.history.volume', { kg: Math.round(e.volume_kg) })}
              </Text>
            </View>
          ))}
        </ScrollView>
      </ScreenContainer>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.xs,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    padding: spacing.lg,
    fontSize: fontSize.sm,
  },
  card: {
    padding: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  date: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  workout: {
    flex: 1,
    fontSize: fontSize.xs,
  },
  best: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  sets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  setChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  setText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  volume: {
    fontSize: fontSize.xs,
  },
});
