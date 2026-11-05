/**
 * Who may see, send or drop an entry of the offline queues (the SQLite finish
 * outbox and the legacy AsyncStorage queue) on a device that more than one
 * account may use.
 *
 * Entries carry the id of the account that recorded them. Entries written before
 * the id existed, or while the signed-in user was not known yet, have `null`.
 */

/** True only when both sides are known and equal. `null` on either side is never a match. */
export function isOwnedBy(entryUserId: number | null | undefined, userId: number | null): boolean {
  return entryUserId != null && userId != null && entryUserId === userId;
}

/**
 * What the queue screen shows: the viewer's own entries, plus entries whose owner
 * was never recorded (otherwise nobody could ever retry or export them). Another
 * account's entries stay hidden until that account signs in.
 */
export function isVisibleTo(
  entryUserId: number | null | undefined,
  userId: number | null,
): boolean {
  return isOwnedBy(entryUserId, userId) || entryUserId == null;
}
