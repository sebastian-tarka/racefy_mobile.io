import type { Ionicons } from '@expo/vector-icons';
import type { NavigationState } from '../hooks/useLiveNavigation';
import type { RouteTurnInstruction } from '../types/api';

/**
 * Distance at which the next turn stops being information and becomes an
 * instruction — the banner switches to its "act now" look here (design
 * "Racefy v2" → NavBanner, `imminent`).
 */
export const IMMINENT_METERS = 120;

/** Ionicons stand-in for a router maneuver string ("turn-left", "u-turn", …). */
export function turnIcon(maneuver: string): keyof typeof Ionicons.glyphMap {
  const m = maneuver.toLowerCase();
  if (m.includes('u-turn') || m.includes('uturn')) return 'return-down-back';
  if (m.includes('sharp-left')) return 'return-up-back';
  if (m.includes('sharp-right')) return 'return-up-forward';
  if (m.includes('left')) return 'arrow-back';
  if (m.includes('right')) return 'arrow-forward';
  if (m.includes('arrive') || m.includes('finish')) return 'flag';
  if (m.includes('depart') || m.includes('start')) return 'play';
  return 'arrow-up';
}

/** Translation key for the maneuver's short label. */
export function turnLabelKey(maneuver: string): string {
  const m = maneuver.toLowerCase();
  if (m.includes('u-turn') || m.includes('uturn')) return 'navigation.uTurn';
  if (m.includes('sharp-left')) return 'navigation.sharpLeft';
  if (m.includes('sharp-right')) return 'navigation.sharpRight';
  if (m.includes('left')) return 'navigation.turnLeft';
  if (m.includes('right')) return 'navigation.turnRight';
  if (m.includes('arrive') || m.includes('finish')) return 'navigation.arrive';
  return 'navigation.goStraight';
}

export interface NavBannerState {
  /** The instruction to follow now. Null once the last one is behind us. */
  current: RouteTurnInstruction | null;
  /** The one after it — the "then …" peek. */
  after: RouteTurnInstruction | null;
  /** Metres to `current`, or null when there is none left. */
  distanceToTurn: number | null;
  /** 0..1 through the leg between the previous instruction and `current`. */
  legProgress: number;
  /** Metres left to the end of the route. */
  remaining: number;
  /** Every instruction is behind us. */
  done: boolean;
  /** Close enough that the banner should shout. */
  imminent: boolean;
  offRoute: boolean;
  distanceFromRoute: number;
}

/**
 * Folds the live navigation state and the route's instruction list into the one
 * thing the banner shows: a single next instruction with its countdown.
 *
 * `NavigationState` already knows which turn is next and how far it is; what it
 * does not carry is the turn *after* that one, or how much of the current leg is
 * behind us — both come from the ordered list, keyed on `distance_along`.
 */
export function navBannerState(
  turns: RouteTurnInstruction[],
  nav: NavigationState,
): NavBannerState | null {
  if (!nav.isActive) return null;

  const base = {
    remaining: nav.distanceRemaining,
    offRoute: nav.isOffRoute,
    distanceFromRoute: nav.distanceFromRoute,
  };

  if (!nav.nextTurn) {
    return {
      ...base,
      current: null,
      after: null,
      distanceToTurn: null,
      legProgress: 1,
      done: true,
      imminent: false,
    };
  }

  const index = turns.findIndex((turn) => turn.distance_along === nav.nextTurn!.distance_along);
  const after = index >= 0 ? (turns[index + 1] ?? null) : null;
  const previousAt = index > 0 ? turns[index - 1].distance_along : 0;
  const legLength = Math.max(1, nav.nextTurn.distance_along - previousAt);
  const legProgress = Math.min(1, Math.max(0, (nav.distanceAlong - previousAt) / legLength));

  return {
    ...base,
    current: nav.nextTurn,
    after,
    distanceToTurn: nav.distanceToTurn,
    legProgress,
    done: false,
    imminent: nav.distanceToTurn != null && nav.distanceToTurn <= IMMINENT_METERS,
  };
}
