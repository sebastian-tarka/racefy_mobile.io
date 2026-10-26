import { useCallback, useMemo, useRef, type MutableRefObject } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import type { TFunction } from 'i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  announceEnd,
  announceStart,
  isProvisionalActivity,
  triggerHaptic,
  type useLiveActivityContext,
} from '../../../hooks';
import {
  isBatteryOptimized,
  requestIgnoreBatteryOptimizations,
} from '../../../services/batteryOptimization';
import { logger } from '../../../services/logger';
import { clearWorkoutSession } from '../../../services/workout/storage';
import { cancelGoalNotification } from '../../../services/workout/goalNotification';
import type { RootStackParamList } from '../../../navigation';
import type {
  Activity,
  Event,
  MilestoneSingle,
  SportType,
  SubscriptionTier,
} from '../../../types/api';
import type { AudioCoachSettings } from '../../../types/audioCoach';
import type { GuidedWorkout } from '../../../types/workout';
import { describeSaveOutcome, type SaveOutcome } from './saveOutcome';

type LiveActivity = ReturnType<typeof useLiveActivityContext>;

const BATTERY_PROMPT_KEY = '@racefy_battery_prompt_shown';

export interface RecordingActionsInput {
  t: TFunction;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  live: Pick<
    LiveActivity,
    | 'activity'
    | 'isTracking'
    | 'currentStats'
    | 'startTracking'
    | 'pauseTracking'
    | 'resumeTracking'
    | 'finishTracking'
    | 'discardTracking'
  >;
  localDuration: number;
  selectedSport: SportType | null;
  selectedEvent: Event | null;
  setSelectedEvent: (event: Event | null) => void;
  skipAutoPost: boolean;
  setSkipAutoPost: (skip: boolean) => void;
  setShowFinish: (show: boolean) => void;
  setWorkoutPlan: (plan: GuidedWorkout | null) => void;
  /** Shared with the "unfinished activity" dialog, which also finishes. */
  isFinishingRef: MutableRefObject<boolean>;
  requestActivityTrackingPermissions: () => Promise<unknown>;
  refreshGpsHealth: () => void;
  showOfflineToast: () => void;
  distanceMilestones: MilestoneSingle[];
  resetMilestones: () => void;
  audioCoachSettings: AudioCoachSettings;
  persistEffectiveAudioCoachEnabled: () => void;
  restoreAudioCoachSettings: () => void;
  tier: SubscriptionTier;
  enrichActivityWithHeartRate: (activity: Activity) => Promise<unknown>;
}

export interface RecordingActions {
  handleStart: () => Promise<void>;
  handlePause: () => Promise<void>;
  handleResume: () => Promise<void>;
  /** Pauses and opens the finish screen — never writes anything. */
  handleStop: () => Promise<void>;
  handleSave: (options?: { title?: string; share?: boolean }) => Promise<void>;
  handleDiscard: () => Promise<void>;
}

/**
 * Start / pause / resume / stop / save / discard for the recording screen.
 *
 * The handlers keep one identity for the life of the screen: they read the
 * latest inputs through a ref instead of closing over a render. The screen
 * re-renders every second while recording, and a fresh `onPause` each time
 * made every child that took one re-render with it.
 */
export function useRecordingActions(input: RecordingActionsInput): RecordingActions {
  const ref = useRef(input);
  ref.current = input;

  /** Everything that belonged to the recording that just ended — saved or discarded. */
  const resetAfterRecording = useCallback(() => {
    const i = ref.current;
    i.resetMilestones();
    i.setShowFinish(false);
    // The pin belonged to this recording; the next activity starts unpinned.
    i.setSelectedEvent(null);
    // Restore original audio coach settings in AsyncStorage (undo session toggle)
    i.restoreAudioCoachSettings();
    // The goal belonged to this recording; forget it (and its background state).
    i.setWorkoutPlan(null);
    void clearWorkoutSession();
    void cancelGoalNotification();
  }, []);

  const showSaveOutcome = useCallback((outcome: SaveOutcome) => {
    const { t, navigation } = ref.current;
    // Points (or the lack of them — the activity didn't meet the thresholds).
    const pointsMessage = (points: number | null) =>
      !points ? t('recording.noPointsAwarded') : t('recording.pointsAwarded', { points });

    switch (outcome.kind) {
      case 'queued-needs-attention':
        Alert.alert(
          t('recording.savedOnDeviceTitle'),
          t('recording.savedNeedsAttention', { reason: outcome.reason }),
          [
            { text: t('recording.later'), style: 'cancel' },
            {
              text: t('recording.openUnsynced'),
              onPress: () => navigation.navigate('UnsyncedActivities'),
            },
          ],
        );
        return;
      case 'queued':
        Alert.alert(t('recording.savedOnDeviceTitle'), t('recording.savedOnDeviceBody'));
        return;
      case 'published':
        Alert.alert(
          t('common.success'),
          `${t('recording.activityShared')}\n\n${pointsMessage(outcome.pointsEarned)}`,
        );
        return;
      case 'draft':
        Alert.alert(
          t('recording.activitySaved'),
          `${t('recording.draftCreated')}\n\n${pointsMessage(outcome.pointsEarned)}`,
          [
            { text: t('recording.later'), style: 'cancel' },
            {
              text: t('recording.viewDraft'),
              onPress: () => navigation.navigate('PostDetail', { postId: outcome.postId }),
            },
          ],
        );
        return;
      case 'saved':
        Alert.alert(
          t('common.success'),
          `${t('recording.activitySaved')}\n\n${pointsMessage(outcome.pointsEarned)}`,
        );
        return;
      case 'silent':
        return;
    }
  }, []);

  // One-time (per install) battery-optimization prompt before the first
  // recording on Android — an optimized app risks the OS killing GPS mid-run.
  // Never blocks the start: declining just skips the exemption.
  const maybePromptBatteryExemption = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'android') return;
    const { t } = ref.current;
    try {
      const alreadyShown = await AsyncStorage.getItem(BATTERY_PROMPT_KEY);
      if (alreadyShown) return;
      if (!(await isBatteryOptimized())) return;

      await AsyncStorage.setItem(BATTERY_PROMPT_KEY, '1');

      await new Promise<void>((resolve) => {
        Alert.alert(t('recording.batteryPrompt.title'), t('recording.batteryPrompt.message'), [
          { text: t('recording.batteryPrompt.later'), style: 'cancel', onPress: () => resolve() },
          {
            text: t('recording.batteryPrompt.allow'),
            onPress: async () => {
              await requestIgnoreBatteryOptimizations();
              ref.current.refreshGpsHealth();
              resolve();
            },
          },
        ]);
      });
    } catch (err) {
      logger.warn('activity', 'Battery exemption prompt failed', { error: err });
    }
  }, []);

  const handleStart = useCallback(async () => {
    logger.debug('activity', 'Start button pressed');
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    const { t, selectedSport } = ref.current;
    if (!selectedSport) {
      Alert.alert(t('recording.error'), t('recording.selectSportFirst'));
      return;
    }

    try {
      await ref.current.requestActivityTrackingPermissions();
    } catch (err) {
      logger.error('activity', 'Permission error', { error: err });
    }

    await maybePromptBatteryExemption();

    try {
      const i = ref.current;
      const started = await i.live.startTracking(
        selectedSport.id,
        `${selectedSport.name} Activity`,
        i.selectedEvent?.id,
      );
      // No network: the recording runs locally and is created on the server later.
      // Say so once — silence would leave the athlete wondering whether it counts.
      if (isProvisionalActivity(started)) i.showOfflineToast();
      i.resetMilestones();
      // Keep selectedEvent in state — user may want to change it at save time in PausedView
      logger.activity('Activity started successfully from UI', { sportId: selectedSport.id });

      // Audio coach: announce start + sync the effective session state to
      // AsyncStorage for the background task
      i.persistEffectiveAudioCoachEnabled();
      announceStart(i.audioCoachSettings, i.tier);

      // Store milestone thresholds for background audio coach
      if (i.distanceMilestones.length > 0) {
        const thresholds = i.distanceMilestones.filter((m) => !m.achieved).map((m) => m.threshold);
        if (thresholds.length > 0) {
          import('../../../services/backgroundLocation')
            .then((m) => m.setAudioCoachMilestones(thresholds))
            .catch(() => {});
        }
      }
    } catch (err) {
      logger.error('activity', 'Failed to start activity from UI', { error: err });
    }
  }, [maybePromptBatteryExemption]);

  const handlePause = useCallback(async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await ref.current.live.pauseTracking();
      logger.activity('Activity paused from UI');
    } catch (err) {
      logger.error('activity', 'Failed to pause activity from UI', { error: err });
    }
  }, []);

  const handleResume = useCallback(async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await ref.current.live.resumeTracking();
      logger.activity('Activity resumed from UI');
    } catch (err) {
      logger.error('activity', 'Failed to resume activity from UI', { error: err });
    }
  }, []);

  const handleStop = useCallback(async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    // Pause the timer, then let the athlete review before anything is written.
    // Pausing is local and does not need the network; whatever happens, the
    // athlete gets to the finish screen — a Stop button that does nothing with no
    // signal is the one thing this must never be.
    try {
      if (ref.current.live.isTracking) {
        await ref.current.live.pauseTracking();
      }
    } catch (err) {
      logger.error('activity', 'Failed to pause on stop', { error: err });
    } finally {
      ref.current.setShowFinish(true);
    }
  }, []);

  const handleSave = useCallback(
    async (options?: { title?: string; share?: boolean }): Promise<void> => {
      const i = ref.current;
      const { activity } = i.live;
      const { selectedSport, t } = i;
      if (!activity || !selectedSport) return;
      if (i.isFinishingRef.current) return;

      i.isFinishingRef.current = true;
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

      // "Save private" on the finish screen is the same thing the old paused
      // screen called "Don't share to feed".
      const skip = options?.share === undefined ? i.skipAutoPost : !options.share;

      try {
        const result = await i.live.finishTracking({
          title: options?.title?.trim() || `${selectedSport.name} Activity`,
          calories: Math.floor(i.localDuration * 0.15),
          skip_auto_post: skip,
          event_id: i.selectedEvent?.id ?? null,
        });

        // Cancelled (GPS-gap dialog) or a duplicate tap: nothing was saved, stay here.
        if (!result) return;

        // Either the server answered while we waited, or the activity is safe in
        // the phone's outbox and goes out when the network allows.
        const delivered = result.queued ? null : result;

        logger.activity('Activity saved from UI', {
          activityId: delivered?.activity.id ?? (result.queued ? result.activityId : undefined),
          queued: !!result.queued,
          hasPost: !!delivered?.post,
        });

        // Audio coach: announce end with summary
        const totalKm = i.live.currentStats.distance / 1000;
        const avgPace =
          i.localDuration > 0 && totalKm > 0
            ? i.localDuration / 60 / totalKm // min/km
            : 0;
        if (avgPace > 0) {
          announceEnd(i.audioCoachSettings, totalKm, avgPace, i.tier);
        }

        // Fire-and-forget: enrich activity with HR data from Health Connect / HealthKit
        if (delivered) {
          i.enrichActivityWithHeartRate(delivered.activity).catch(() => {
            // Silently ignore — enrichment is non-blocking
          });
        }

        i.setSkipAutoPost(false);
        resetAfterRecording();
        showSaveOutcome(describeSaveOutcome(result));
      } catch (err) {
        logger.error('activity', 'Failed to save activity from UI', { error: err });
        Alert.alert(t('recording.saveFailedTitle'), t('recording.saveFailed'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('recording.retry'),
            onPress: () => {
              ref.current.isFinishingRef.current = false;
              // Same title and share choice — a bare handleSave() used to drop both.
              void handleSave(options);
            },
          },
        ]);
      } finally {
        i.isFinishingRef.current = false;
      }
    },
    [resetAfterRecording, showSaveOutcome],
  );
  const handleDiscard = useCallback(async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const { t } = ref.current;
    Alert.alert(t('recording.discardActivity'), t('recording.discardConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('recording.discard'),
        style: 'destructive',
        onPress: async () => {
          try {
            await ref.current.live.discardTracking();
            resetAfterRecording();
            logger.activity('Activity discarded from UI');
          } catch (err) {
            logger.error('activity', 'Failed to discard activity from UI', { error: err });
          }
        },
      },
    ]);
  }, [resetAfterRecording]);

  return useMemo(
    () => ({ handleStart, handlePause, handleResume, handleStop, handleSave, handleDiscard }),
    [handleStart, handlePause, handleResume, handleStop, handleSave, handleDiscard],
  );
}
