import type { ActivityStats, SportTypeStat } from '../types/api';

export interface NormalizedSportStat extends SportTypeStat {
  /** Null when neither the entry nor its key identifies a sport type. */
  sportTypeId: number | null;
}

/**
 * One shape for the per-sport breakdown, whatever the API sent.
 *
 * `/stats/activities` used to return a map keyed by sport-type id; it now
 * returns a list of entries that name themselves. Read as a map, that list has
 * keys "0", "1", "2" — which match no sport, which is why every row rendered as
 * "Other". Both shapes go through here.
 */
export function normalizeSportTypeStats(
  bySportType: ActivityStats['by_sport_type'] | undefined | null,
): NormalizedSportStat[] {
  if (!bySportType) return [];

  const entries: NormalizedSportStat[] = Array.isArray(bySportType)
    ? bySportType.map((entry) => ({ ...entry, sportTypeId: entry.sport_type_id ?? null }))
    : Object.entries(bySportType).map(([key, entry]) => {
        const fromKey = Number(key);
        return {
          ...entry,
          sportTypeId: entry.sport_type_id ?? (Number.isFinite(fromKey) ? fromKey : null),
        };
      });

  return entries.filter((entry) => (entry.count ?? 0) > 0);
}

/** The same breakdown, looked up by sport-type id. */
export function findSportTypeStat(
  bySportType: ActivityStats['by_sport_type'] | undefined | null,
  sportTypeId: number | null,
): NormalizedSportStat | undefined {
  if (sportTypeId == null) return undefined;
  return normalizeSportTypeStats(bySportType).find((entry) => entry.sportTypeId === sportTypeId);
}
