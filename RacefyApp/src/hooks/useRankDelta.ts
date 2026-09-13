import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../services/logger';
import type { UserPointStats } from '../types/api';

const STORAGE_KEY = '@racefy_seen_ranks';

type SeenRanks = Partial<Record<'weekly' | 'monthly' | 'global', number>>;

/**
 * Places gained or lost since this device last looked at the board.
 *
 * The API returns the current rank only — there is no "previous rank" field
 * anywhere — so the direction of travel is derived here: remember what was
 * last shown, diff against it, then store the new value. A `null` delta is a
 * real answer, not a failure: on the first visit of a period there is nothing
 * to compare against, and `RankDelta` renders a dash for exactly that case.
 *
 * Writing on read is deliberate. The alternative — writing on a period
 * boundary — needs a clock the client does not have (the server decides when a
 * week rolls over), and would show a stale delta for days after a reset.
 */
export function useRankDelta(stats: UserPointStats | null) {
  const [deltas, setDeltas] = useState<SeenRanks>({});

  useEffect(() => {
    if (!stats) return;

    let cancelled = false;

    const run = async () => {
      const current: SeenRanks = {
        weekly: stats.weekly_rank,
        monthly: stats.monthly_rank,
        global: stats.global_rank,
      };

      let seen: SeenRanks = {};
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) seen = JSON.parse(raw) as SeenRanks;
      } catch (error) {
        // A missing or corrupt record just means "no history" — the block
        // still renders, without arrows.
        logger.warn('general', 'Failed to read seen ranks', { error });
      }

      if (cancelled) return;

      // A lower rank number is a better position, so the gain is seen - current.
      setDeltas({
        weekly: diff(seen.weekly, current.weekly),
        monthly: diff(seen.monthly, current.monthly),
        global: diff(seen.global, current.global),
      });

      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      } catch (error) {
        logger.warn('general', 'Failed to persist seen ranks', { error });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [stats]);

  return deltas;
}

function diff(seen: number | undefined, current: number | undefined): number | undefined {
  if (seen == null || current == null) return undefined;
  return seen - current;
}
