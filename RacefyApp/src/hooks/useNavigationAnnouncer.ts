import { useEffect, useRef } from 'react';
import * as Speech from 'expo-speech';
import i18n from 'i18next';
import { logger } from '../services/logger';
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
        ? `${i18n.t('navigation.in', { defaultValue: 'In' })} ${formatDistance(distanceToTurn)}, `
        : '';
    const phrase = `${distText}${nextTurn.instruction}`.trim();

    Speech.stop()
      .catch(() => {})
      .finally(() => {
        Speech.speak(phrase, {
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
      const phrase = i18n.t('navigation.offRoute', { defaultValue: 'Off route' });
      Speech.speak(phrase, { language: i18n.language || 'en' });
      logger.debug('activity', 'Navigation TTS off-route');
    } else if (!isOffRoute && lastOffRouteRef.current) {
      lastOffRouteRef.current = false;
      const phrase = i18n.t('navigation.backOnRoute', { defaultValue: 'Back on route' });
      Speech.speak(phrase, { language: i18n.language || 'en' });
    }
  }, [isOffRoute, isActive]);
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${km.toFixed(km < 10 ? 1 : 0)} ${i18n.t('units.km', { defaultValue: 'kilometers' })}`;
  }
  const rounded = Math.round(meters / 10) * 10;
  return `${rounded} ${i18n.t('units.m', { defaultValue: 'meters' })}`;
}
