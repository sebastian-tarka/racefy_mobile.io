import { useEffect, useRef } from 'react';
import * as Speech from 'expo-speech';
import i18n from 'i18next';
import { logger } from '../services/logger';
import { speakDucked } from '../services/audioCoach/audioSession';
import type { RouteTurnInstruction } from '../types/api';

interface Params {
  nextTurn: RouteTurnInstruction | null;
  distanceToTurn: number | null;
  shouldAnnounce: boolean;
  isOffRoute: boolean;
  isActive: boolean;
}

/**
 * Speaks turn instructions and off-route alerts via expo-speech.
 * - Goes through speakDucked so music ducks (or pauses) around each prompt
 * - Announces each upcoming turn at most once
 * - Speaks "off route" once per off-route entry (not on every reading)
 */
export function useNavigationAnnouncer({
  nextTurn,
  distanceToTurn,
  shouldAnnounce,
  isOffRoute,
  isActive,
}: Params) {
  const lastAnnouncedTurnIdRef = useRef<number | null>(null);
  const lastOffRouteRef = useRef<boolean>(false);

  // Stop any in-flight speech when navigation deactivates
  useEffect(() => {
    if (!isActive) {
      lastAnnouncedTurnIdRef.current = null;
      lastOffRouteRef.current = false;
      Speech.stop().catch(() => {});
    }
  }, [isActive]);

  // Announce turn
  useEffect(() => {
    if (!isActive || !shouldAnnounce || !nextTurn) return;
    const turnId = nextTurn.distance_along;
    if (lastAnnouncedTurnIdRef.current === turnId) return;
    lastAnnouncedTurnIdRef.current = turnId;

    const distText =
      distanceToTurn != null && distanceToTurn > 0
        ? `${i18n.t('navigation.in')} ${formatSpokenDistance(distanceToTurn)}, `
        : '';
    const phrase = `${distText}${nextTurn.instruction}`.trim();

    Speech.stop()
      .catch(() => {})
      .finally(() => {
        // Ducks/pauses the athlete's music for the turn prompt, per their
        // audio preference — same path as the audio coach.
        void speakDucked(phrase, {
          language: i18n.language || 'en',
          rate: 1.0,
          pitch: 1.0,
        });
        logger.debug('activity', 'Navigation TTS', { phrase });
      });
  }, [shouldAnnounce, nextTurn, distanceToTurn, isActive]);

  // Announce off-route entry/exit
  useEffect(() => {
    if (!isActive) return;
    if (isOffRoute && !lastOffRouteRef.current) {
      lastOffRouteRef.current = true;
      const phrase = i18n.t('navigation.offRoute');
      void speakDucked(phrase, { language: i18n.language || 'en' });
      logger.debug('activity', 'Navigation TTS off-route');
    } else if (!isOffRoute && lastOffRouteRef.current) {
      lastOffRouteRef.current = false;
      const phrase = i18n.t('navigation.backOnRoute');
      void speakDucked(phrase, { language: i18n.language || 'en' });
    }
  }, [isOffRoute, isActive]);
}

/**
 * Distance phrased for TTS, with locale plural forms ("2 kilometry", "200 metrów").
 * Kilometres are rounded to 0.1 below 10 km; metres to the nearest 10.
 */
export function formatSpokenDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    const count = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
    const decimalSep = (i18n.language || 'en').startsWith('pl') ? ',' : '.';
    const value = String(count).replace('.', decimalSep);
    return i18n.t('navigation.spokenKilometers', { count, value });
  }
  const count = Math.max(10, Math.round(meters / 10) * 10);
  return i18n.t('navigation.spokenMeters', { count, value: String(count) });
}
