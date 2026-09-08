import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../../theme';
import type { WorkoutSession } from '../../../types/workouts';

export interface SessionConflict {
  reason: 'in_progress_exists' | 'already_logged';
  session: WorkoutSession;
}

interface Props {
  conflict: SessionConflict | null;
  onClose: () => void;
  /** Open the session that stands in the way. */
  onOpenSession: (sessionId: number) => void;
  /** Offered when the blocking session was skipped — it can be brought back. */
  onResumeSession: (session: WorkoutSession) => void;
  formatDate: (iso: string) => string;
}

/**
 * The 409 the server answers with when a day is already spoken for.
 *
 * Shared by starting, moving and resuming, because all three collide the same
 * way and the athlete's next move is the same: look at the session that is in
 * the way. Nothing here abandons that session on their behalf — an open workout
 * is data, and only its owner gets to decide it is over.
 */
export function SessionConflictDialog({
  conflict,
  onClose,
  onOpenSession,
  onResumeSession,
  formatDate,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  if (!conflict) return null;

  const { reason, session } = conflict;
  const inProgress = reason === 'in_progress_exists';
  const canResume = !inProgress && session.status === 'skipped';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centered} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <View
            style={[
              styles.icon,
              { backgroundColor: (inProgress ? colors.warning : colors.info) + '1F' },
            ]}
          >
            <Ionicons
              name={inProgress ? 'hourglass-outline' : 'checkmark-done-outline'}
              size={22}
              color={inProgress ? colors.warning : colors.info}
            />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {inProgress
              ? t('strengthPlans.conflict.inProgressTitle', { name: session.workout_name })
              : t('strengthPlans.conflict.loggedTitle', {
                  date: formatDate(session.scheduled_for),
                })}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {inProgress
              ? t('strengthPlans.conflict.inProgressBody')
              : t('strengthPlans.conflict.loggedBody')}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondary, { backgroundColor: colors.background }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>

            {canResume && (
              <TouchableOpacity
                style={[styles.secondary, { backgroundColor: colors.background }]}
                onPress={() => onResumeSession(session)}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
                  {t('strengthPlans.schedule.resumeSkipped')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.primary, { backgroundColor: colors.primary }]}
              onPress={() => onOpenSession(session.id)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryText}>
                {t(inProgress ? 'strengthPlans.conflict.open' : 'strengthPlans.conflict.view')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,26,20,0.5)',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    borderRadius: 22,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  body: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondary: {
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  primary: {
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
