import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { logger } from '../services/logger';
import {
  buildAnnouncementText,
  buildEndAnnouncement,
  buildMilestoneAnnouncement,
  buildStartAnnouncement,
} from '../services/audioCoach/templates';
import { speakText, stopSpeaking } from '../services/audioCoach/tts';
import { isSplitSuppressed } from '../services/workout/audioArbiter';
import { getSplitPaceMinPerKm } from '../services/audioCoach/splitPace';
import type { AudioCoachSettings } from '../types/audioCoach';

/** Shared AsyncStorage keys — same as in backgroundLocation.ts */
const BG_AUDIO_THRESHOLD_KEY = '@racefy:audioCoach:bgLastThreshold';
const BG_AUDIO_TIER_KEY = '@racefy:audioCoach:tier';

interface UseAudioCoachParams {
  settings: AudioCoachSettings;
  totalDistanceKm: number;
  /** Fallback only — the announced pace is the finished split (see splitPace.ts). */
  currentPaceMinPerKm: number;
  heartRate?: number;
  previousKmPace?: number;
  userTier?: 'free' | 'plus' | 'pro';
  /**
   * The recording whose point log holds the splits (server id, or the
   * provisional id of an offline start). Null = no split, fall back to
   * `currentPaceMinPerKm`.
   */
  activityId?: number | null;
}

/**
 * Foreground hook that triggers voice announcements at km thresholds.
 * Syncs with background task via shared AsyncStorage key to prevent double announcements.
 * Idempotent — safe to call every render.
 */
export function useAudioCoach({
  settings,
  totalDistanceKm,
  currentPaceMinPerKm,
  heartRate,
  previousKmPace,
  userTier = 'free',
  activityId = null,
}: UseAudioCoachParams): void {
  const lastAnnouncedThreshold = useRef(0);
  const prevDistanceRef = useRef(0);
  const isOnlineRef = useRef(true);

  // Reset threshold when distance drops (new activity or sim restart)
  if (totalDistanceKm < prevDistanceRef.current * 0.5) {
    lastAnnouncedThreshold.current = 0;
  }
  prevDistanceRef.current = totalDistanceKm;

  // Track network state
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      isOnlineRef.current = state.isConnected ?? true;
    });
    return () => unsubscribe();
  }, []);

  // Mirror the subscription tier for the background task — it has no auth
  // context, and without the tier it would always announce with the offline
  // system voice even when the user configured an AI voice.
  useEffect(() => {
    AsyncStorage.setItem(BG_AUDIO_TIER_KEY, userTier).catch(() => {});
  }, [userTier]);

  // Sync with background task threshold on mount / when distance changes significantly
  useEffect(() => {
    AsyncStorage.getItem(BG_AUDIO_THRESHOLD_KEY)
      .then((val) => {
        if (val) {
          const bgThreshold = parseFloat(val);
          if (bgThreshold > lastAnnouncedThreshold.current) {
            lastAnnouncedThreshold.current = bgThreshold;
            logger.debug('audioCoach', 'Synced with background threshold', { bgThreshold });
          }
        }
      })
      .catch(() => {});
  }, [Math.floor(totalDistanceKm)]);

  // Stop speech only on unmount (not when disabled — preview may be playing from Settings)
  const prevEnabledRef = useRef(settings.enabled);
  useEffect(() => {
    // Only stop if transitioning from enabled → disabled (user toggled off mid-session)
    if (prevEnabledRef.current && !settings.enabled) {
      stopSpeaking();
    }
    prevEnabledRef.current = settings.enabled;
  }, [settings.enabled]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // Check for km threshold crossing
  useEffect(() => {
    if (!settings.enabled) return;
    if (settings.intervalKm <= 0) return;
    if (totalDistanceKm <= 0) return;

    const currentThreshold =
      Math.floor(totalDistanceKm / settings.intervalKm) * settings.intervalKm;

    if (currentThreshold <= 0) return;
    if (currentThreshold <= lastAnnouncedThreshold.current) return;

    // The split of the kilometre just finished, in moving time, from the
    // point log; the smoothed live pace only when there is no log (web).
    const splitPace = activityId
      ? getSplitPaceMinPerKm(activityId, currentThreshold - settings.intervalKm, currentThreshold)
      : null;
    const pace = splitPace ?? currentPaceMinPerKm;
    // Nothing to say yet (first fix after a resume): try again on the next tick.
    if (pace <= 0) return;

    // New threshold crossed
    lastAnnouncedThreshold.current = currentThreshold;

    // Write to AsyncStorage so background task knows not to re-announce
    AsyncStorage.setItem(BG_AUDIO_THRESHOLD_KEY, currentThreshold.toString()).catch(() => {});

    // A workout cue ("goal reached") just played — one sentence, not two.
    // The threshold is already marked, so the split is dropped rather than delayed.
    if (isSplitSuppressed()) {
      logger.info('audioCoach', 'Split suppressed by workout cue', { km: currentThreshold });
      return;
    }

    logger.info('audioCoach', 'Threshold crossed, announcing', {
      km: currentThreshold,
      pace,
      source: splitPace != null ? 'split' : 'current',
      heartRate,
      tier: userTier,
    });

    // Only include HR and split data for PRO tier
    const includeHeartRate = userTier === 'pro' && settings.announceHeartRate;
    const includeSplitDelta = userTier === 'pro' && settings.announceSplitDelta;

    // Split delta against the previous interval — from the log when it has
    // one, else from whatever the caller passed.
    let splitDelta: number | undefined;
    if (includeSplitDelta) {
      const previous =
        (activityId && splitPace != null
          ? getSplitPaceMinPerKm(
              activityId,
              currentThreshold - 2 * settings.intervalKm,
              currentThreshold - settings.intervalKm,
            )
          : null) ??
        previousKmPace ??
        0;
      if (previous > 0) {
        // Delta in seconds: positive = slower, negative = faster
        splitDelta = Math.round((pace - previous) * 60);
      }
    }

    const text = buildAnnouncementText({
      language: settings.language,
      style: settings.style,
      km: currentThreshold,
      pace,
      heartRate: includeHeartRate ? heartRate : undefined,
      splitDelta,
    });

    speakText(text, settings, userTier, isOnlineRef.current);

    // Check milestone announcement (premium feature)
    const milestoneText = buildMilestoneAnnouncement(settings.language, currentThreshold);
    if (milestoneText) {
      // Delay milestone so km announcement finishes first
      setTimeout(() => {
        speakText(milestoneText, settings, userTier, isOnlineRef.current);
      }, 4000);
    }
  }, [
    settings,
    totalDistanceKm,
    currentPaceMinPerKm,
    heartRate,
    previousKmPace,
    userTier,
    activityId,
  ]);
}

/**
 * Speak start/end announcements. Call directly from event handlers.
 */
export function announceStart(
  settings: AudioCoachSettings,
  userTier: 'free' | 'plus' | 'pro' = 'free',
  isOnline = true,
): void {
  if (!settings.enabled) return;
  const text = buildStartAnnouncement(settings.language);
  speakText(text, settings, userTier, isOnline);
}

export function announceEnd(
  settings: AudioCoachSettings,
  totalKm: number,
  avgPaceMinPerKm: number,
  userTier: 'free' | 'plus' | 'pro' = 'free',
  isOnline = true,
): void {
  if (!settings.enabled) return;
  const text = buildEndAnnouncement(settings.language, totalKm, avgPaceMinPerKm);
  speakText(text, settings, userTier, isOnline);
}
