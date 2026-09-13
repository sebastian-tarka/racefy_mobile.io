/**
 * Read a numeric id out of a push payload.
 *
 * FCM requires every value in the `data` object to be a string, so an id
 * arrives as `"247"`. The declared types say `number` because that is what the
 * rest of the app passes around, and passing `"247"` into a route that expects
 * a number fails in ways that only show up on a real device.
 *
 * Returns `undefined` for anything that is not a usable id, so callers can
 * decide what to do instead of navigating somewhere with `NaN`.
 */
export function pushId(value: number | string | undefined | null): number | undefined {
  if (value == null) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
