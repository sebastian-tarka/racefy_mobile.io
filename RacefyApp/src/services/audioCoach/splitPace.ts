/**
 * The pace the coach announces at a km threshold: the split of the interval
 * just finished, in moving time.
 *
 * Both announcement paths (the foreground hook and the background GPS task)
 * read it from the same place — the SQLite point log — so "Kilometr 3, tempo
 * 5:30" means the same thing whichever of them wins the race to speak. Before
 * this, the foreground spoke the smoothed instantaneous pace and the
 * background the average since its own start time, which a pause (and, on
 * iOS, every screen lock) reset — hence splits of "0 minutes 5 seconds".
 *
 * A pause is simply a hole in the point log: GPS is stopped, no points land.
 * Any hop between consecutive points longer than the GPS-gap threshold is
 * therefore treated as not-moving and left out, the same rule the tracker
 * uses for segment breaks.
 */
import { GPS_GAP_THRESHOLD_MS } from '../../constants/tracking';
import * as trackingDb from '../trackingDb';

interface SplitSample {
  /** ISO 8601 */
  ts: string;
  cumDist?: number;
}

/**
 * Moving-time pace (min/km) over [fromM, toM] from an ordered point list, or
 * null when the points do not cover enough of the interval to mean anything.
 */
export function splitPaceFromPoints(
  points: SplitSample[],
  fromM: number,
  toM: number,
  gapMs: number = GPS_GAP_THRESHOLD_MS,
): number | null {
  let movingMs = 0;
  let distM = 0;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a.cumDist == null || b.cumDist == null) continue;

    const dt = Date.parse(b.ts) - Date.parse(a.ts);
    const dd = b.cumDist - a.cumDist;
    if (!(dt > 0) || !(dd >= 0)) continue;
    // A hole longer than the gap threshold is a pause or a lost signal, not
    // running — the distance across it (if any) is not timed either.
    if (dt > gapMs) continue;

    // Clip the first interval to the split start: the anchor point lies before it.
    const clippedDd = Math.max(0, Math.min(b.cumDist, toM) - Math.max(a.cumDist, fromM));
    const clippedDt = dd > 0 ? dt * (clippedDd / dd) : 0;
    movingMs += clippedDt;
    distM += clippedDd;
  }

  const span = toM - fromM;
  if (span <= 0 || distM < span * 0.5 || movingMs <= 0) return null;

  const minPerKm = movingMs / 60000 / (distM / 1000);
  // Same sanity window as the live pace display: 1:00–30:00 /km.
  if (minPerKm < 1 || minPerKm > 30) return null;
  return minPerKm;
}

/**
 * Split pace for [fromKm, toKm] of the recording behind `serverActivityId`
 * (null = whichever session is active — the background task's view). Null when
 * there is no point log (web) or it does not cover the interval; callers fall
 * back to whatever pace they have.
 */
export function getSplitPaceMinPerKm(
  serverActivityId: number | null,
  fromKm: number,
  toKm: number,
): number | null {
  try {
    const session = trackingDb.resolveRecordingSession(serverActivityId);
    if (!session) return null;
    const points = trackingDb.getPointsInDistanceRange(
      session.clientActivityId,
      fromKm * 1000,
      toKm * 1000,
    );
    return splitPaceFromPoints(points, fromKm * 1000, toKm * 1000);
  } catch {
    return null;
  }
}
