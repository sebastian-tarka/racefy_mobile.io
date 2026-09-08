import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { emitRefresh } from '../services/refreshEvents';
import type { WorkoutSessionConflict } from '../types/workouts';

interface UseStartWorkoutSession {
  /** Starts (or resumes) a session and hands the id back through `onOpen`. */
  start: (workoutId: number, scheduledFor?: string) => Promise<void>;
  /** Id of the workout currently being started, for a spinner on its button. */
  busyWorkoutId: number | null;
}

/**
 * Starting a strength session, with the two conflicts the API can answer with.
 *
 * `in_progress_exists` is not an error the athlete caused — they left a session
 * open — so it offers to resume that one instead of failing. `already_logged`
 * simply says the day is done. Shared because the calendar and the workout
 * screen both start sessions, and the two must behave identically.
 */
export function useStartWorkoutSession(
  onOpen: (sessionId: number) => void,
): UseStartWorkoutSession {
  const { t } = useTranslation();
  const [busyWorkoutId, setBusyWorkoutId] = useState<number | null>(null);

  const start = useCallback(
    async (workoutId: number, scheduledFor?: string) => {
      setBusyWorkoutId(workoutId);
      try {
        const session = await api.startWorkoutSession(workoutId, scheduledFor);
        emitRefresh('workouts');
        onOpen(session.id);
      } catch (error: any) {
        const conflict = error as Partial<WorkoutSessionConflict> & { status?: number };
        if (error.status === 409 && conflict.reason === 'in_progress_exists' && conflict.session) {
          const open = conflict.session;
          Alert.alert(
            '',
            t('strengthPlans.schedule.conflictInProgress', { name: open.workout_name }),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('strengthPlans.schedule.resume'), onPress: () => onOpen(open.id) },
            ],
          );
        } else if (error.status === 409 && conflict.reason === 'already_logged') {
          Alert.alert('', t('strengthPlans.schedule.conflictLogged'));
        } else {
          Alert.alert('', error.message || t('common.error'));
        }
      } finally {
        setBusyWorkoutId(null);
      }
    },
    [onOpen, t],
  );

  return { start, busyWorkoutId };
}
