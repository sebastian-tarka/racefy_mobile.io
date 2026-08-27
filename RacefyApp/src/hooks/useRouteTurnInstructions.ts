import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { deriveTurnInstructions } from '../utils/turnDetection';
import type { NearbyRoute, RouteTurnInstruction } from '../types/api';

const EMPTY: RouteTurnInstruction[] = [];

/**
 * Resolves turn-by-turn instructions for the selected shadow track.
 *
 * Priority:
 * 1. Router-generated `turn_instructions` already on the route (planned/event routes)
 * 2. For planned routes whose list entry omitted them → fetch `/routes/{id}`
 * 3. Otherwise (raw GPS tracks from /activities/nearby) → derive from geometry
 *    (heading changes; no street names, just "turn left/right/u-turn")
 *
 * Returns a referentially stable array per route so it can sit in effect deps.
 */
export function useRouteTurnInstructions(route: NearbyRoute | null): RouteTurnInstruction[] {
  const { t } = useTranslation();
  const [fetched, setFetched] = useState<{ id: number; turns: RouteTurnInstruction[] } | null>(
    null,
  );

  const routeId = route?.id ?? null;
  const ownTurns = route?.turn_instructions;
  const needsFetch = !!route && route.source === 'planned_route' && !ownTurns?.length;

  useEffect(() => {
    if (!needsFetch || routeId === null) return;
    if (fetched?.id === routeId) return;

    let cancelled = false;
    api
      .getRoute(routeId)
      .then((full) => {
        if (cancelled) return;
        const turns = full.turn_instructions ?? [];
        setFetched({ id: routeId, turns });
        logger.info('activity', 'Planned route turn instructions fetched', {
          routeId,
          turns: turns.length,
        });
      })
      .catch((err: any) => {
        if (cancelled) return;
        // Mark as attempted so we don't retry in a loop; caller falls back to derivation.
        setFetched({ id: routeId, turns: [] });
        logger.warn('activity', 'Failed to fetch planned route turns, deriving from geometry', {
          routeId,
          error: err?.message,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [needsFetch, routeId, fetched?.id]);

  const labels = useMemo(
    () => ({
      left: t('navigation.turnLeft'),
      right: t('navigation.turnRight'),
      sharpLeft: t('navigation.sharpLeft'),
      sharpRight: t('navigation.sharpRight'),
      uTurn: t('navigation.uTurn'),
    }),
    [t],
  );

  return useMemo(() => {
    if (!route?.track_data?.coordinates) return EMPTY;
    if (ownTurns?.length) return ownTurns;
    if (fetched?.id === route.id && fetched.turns.length) return fetched.turns;
    // Planned route still loading — don't announce geometry-derived turns that
    // will be replaced a moment later.
    if (needsFetch && fetched?.id !== route.id) return EMPTY;

    const coords = route.track_data.coordinates as [number, number][];
    const derived = deriveTurnInstructions(coords, labels);
    logger.debug('activity', 'Turn instructions derived from geometry', {
      routeId: route.id,
      source: route.source ?? 'activity',
      turns: derived.length,
    });
    return derived;
  }, [route, ownTurns, fetched, needsFetch, labels]);
}
