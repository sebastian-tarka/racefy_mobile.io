import type { Activity, Photo, Post, SharedPost, Video } from '../types/api';

/** Anything that can own activity media: a feed post, a reshared post. */
type MediaCarrier = Pick<Post, 'photos' | 'videos'> & { activity?: Activity | null };

/**
 * Photos and videos of an activity post, from both sides of the record.
 *
 * The backend moved activity media off the post and onto the activity, so a
 * normal activity post now has `post.photos: []` and everything under
 * `activity.photos`. Reading only the post — which is what this app did —
 * shows an activity post with no photos at all.
 *
 * Merging rather than switching is deliberate and permanent, not a migration
 * shim: `Post::mediaOwner()` still falls back to writing onto the post when an
 * activity post has no activity row yet, and an environment mid-rollout can
 * hold rows from before the move. Both sides therefore stay possible.
 *
 * Order comes from the `order` column, which is continuous across the merged
 * set; rows without one keep the order the API sent them in.
 */
export function mergeActivityPhotos(carrier: MediaCarrier | SharedPost): Photo[] {
  return dedupeAndSort([...(carrier.photos ?? []), ...(carrier.activity?.photos ?? [])]);
}

export function mergeActivityVideos(carrier: MediaCarrier | SharedPost): Video[] {
  return dedupeAndSort([...(carrier.videos ?? []), ...(carrier.activity?.videos ?? [])]);
}

/**
 * The same id can arrive on both sides while an environment is mid-rollout.
 * First occurrence wins — the post side is listed first, and it is the side
 * that exists only when the activity side does not.
 */
function dedupeAndSort<T extends { id: number; order?: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  const unique = items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  // A stable sort keeps API order for anything without an explicit one.
  return unique
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ao = a.item.order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.item.order ?? Number.MAX_SAFE_INTEGER;
      return ao === bo ? a.index - b.index : ao - bo;
    })
    .map(({ item }) => item);
}
