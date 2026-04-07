import { useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { logger } from '../services/logger';
import {
  buildAnnouncementText,
  buildStartAnnouncement,
  buildEndAnnouncement,
  buildMilestoneAnnouncement,
} from '../services/audioCoach/templates';
import { speakText, stopSpeaking } from '../services/audioCoach/tts';
import type { AudioCoachSettings } from '../types/audioCoach';

/** Shared AsyncStorage key — same as in backgroundLocation.ts */
const BG_AUDIO_THRESHOLD_KEY = '@racefy:audioCoach:bgLastThreshold';

interface UseAudioCoachParams {
  settings: AudioCoachSettings;
  totalDistanceKm: number;
  currentPaceMinPerKm: number;
  heartRate?: number;
  previousKmPace?: number;
  userTier?: 'free' | 'plus' | 'pro';
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

  // Sync with background task threshold on mount / when distance changes significantly
  useEffect(() => {
    AsyncStorage.getItem(BG_AUDIO_THRESHOLD_KEY).then((val) => {
      if (val) {
        const bgThreshold = parseFloat(val);
        if (bgThreshold > lastAnnouncedThreshold.current) {
          lastAnnouncedThreshold.current = bgThreshold;
          logger.debug('audioCoach', 'Synced with background threshold', { bgThreshold });
        }
      }
    }).catch(() => {});
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
    return () => { stopSpeaking(); };
  }, []);

  // Check for km threshold crossing
  useEffect(() => {
    if (!settings.enabled) return;
    if (settings.intervalKm <= 0) return;
    if (totalDistanceKm <= 0) return;
    if (currentPaceMinPerKm <= 0) return;

    const currentThreshold =
      Math.floor(totalDistanceKm / settings.intervalKm) * settings.intervalKm;

    if (currentThreshold <= 0) return;
    if (currentThreshold <= lastAnnouncedThreshold.current) return;

    // New threshold crossed
    lastAnnouncedThreshold.current = currentThreshold;

    // Write to AsyncStorage so background task knows not to re-announce
    AsyncStorage.setItem(BG_AUDIO_THRESHOLD_KEY, currentThreshold.toString()).catch(() => {});

    logger.info('audioCoach', 'Threshold crossed, announcing', {
      km: currentThreshold,
      pace: currentPaceMinPerKm,
      heartRate,
      tier: userTier,
    });

    // Only include HR and split data for PRO tier
    const includeHeartRate = userTier === 'pro' && settings.announceHeartRate;
    const includeSplitDelta = userTier === 'pro' && settings.announceSplitDelta;

    // Calculate split delta if we have previous km pace
    let splitDelta: number | undefined;
    if (includeSplitDelta && previousKmPace !== undefined && previousKmPace > 0) {
      // Delta in seconds: positive = slower, negative = faster
      splitDelta = Math.round((currentPaceMinPerKm - previousKmPace) * 60);
    }

    const text = buildAnnouncementText({
      language: settings.language,
      style: settings.style,
      km: currentThreshold,
      pace: currentPaceMinPerKm,
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
  ]);
}

/**
 * Speak start/end announcements. Call directly from event handlers.
 */
export function announceStart(settings: AudioCoachSettings, userTier: 'free' | 'plus' | 'pro' = 'free', isOnline = true): void {
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