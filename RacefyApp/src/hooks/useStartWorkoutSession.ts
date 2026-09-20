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
 * says the day is done — unless what "logged" it was a skip: a skip is the one
 * record that can be taken back, so that case offers to resume the skipped
 * session instead of a dead-end message. (The calendar has inline "Resume" on a
 * skipped row; the workout screen only has this button, so without the offer an
 * accidental skip could not be undone from there at all.) Shared because the
 * calendar and the workout screen both start sessions, and the two must behave
 * identically.
 */
export function useStartWorkoutSession(
  onOpen: (sessionId: number) => void,
): UseStartWorkoutSession {
  const { t } = useTranslation();
  const [busyWorkoutId, setBusyWorkoutId] = useState<number | null>(null);

  /** Returns true when the error was one of the two known conflicts. */
  const handleConflict = useCallback(
    (error: any, resumeSkipped: (sessionId: number) => void): boolean => {
      const conflict = error as Partial<WorkoutSessionConflict> & { status?: number };
      if (error?.status !== 409) return false;
      if (conflict.reason === 'in_progress_exists' && conflict.session) {
        const open = conflict.session;
        Alert.alert(
          '',
          t('strengthPlans.schedule.conflictInProgress', { name: open.workout_name }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('strengthPlans.schedule.resume'), onPress: () => onOpen(open.id) },
          ],
        );
        return true;
      }
      if (conflict.reason === 'already_logged') {
        const blocking = conflict.session;
        if (blocking?.status === 'skipped') {
          Alert.alert('', t('strengthPlans.schedule.conflictSkipped'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('strengthPlans.schedule.resumeSkipped'),
              onPress: () => resumeSkipped(blocking.id),
            },
          ]);
        } else {
          Alert.alert('', t('strengthPlans.schedule.conflictLogged'));
        }
        return true;
      }
      return false;
    },
    [onOpen, t],
  );

  const start = useCallback(
    async (workoutId: number, scheduledFor?: string) => {
      // Bring a skipped session back onto the day the athlete is starting for.
      const resumeSkipped = async (sessionId: number) => {
        setBusyWorkoutId(workoutId);
        try {
          const session = await api.resumeWorkoutSession(sessionId, scheduledFor);
          emitRefresh('workouts');
          onOpen(session.id);
        } catch (error: any) {
          // Resuming can itself hit an open session; a second skipped one cannot
          // be in the way, so this never loops.
          if (!handleConflict(error, () => {})) {
            Alert.alert('', error?.message || t('common.error'));
          }
        } finally {
          setBusyWorkoutId(null);
        }
      };

      setBusyWorkoutId(workoutId);
      try {
        const session = await api.startWorkoutSession(workoutId, scheduledFor);
        emitRefresh('workouts');
        onOpen(session.id);
      } catch (error: any) {
        if (!handleConflict(error, (id) => void resumeSkipped(id))) {
          Alert.alert('', error?.message || t('common.error'));
        }
      } finally {
        setBusyWorkoutId(null);
      }
    },
    [onOpen, t, handleConflict],
  );

  return { start, busyWorkoutId };
}
