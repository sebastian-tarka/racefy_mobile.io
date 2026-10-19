import type { FinishResult } from '../../../hooks/useLiveActivity';

/**
 * What the athlete is told after "Save". Pure, so every branch is testable without
 * rendering the recording screen; the screen turns it into an Alert.
 */
export type SaveOutcome =
  /** Safe in the phone's outbox; the server refused it and the athlete must decide. */
  | { kind: 'queued-needs-attention'; reason: string }
  /** Safe in the phone's outbox; goes out when the network allows. */
  | { kind: 'queued' }
  | { kind: 'published'; pointsEarned: number | null }
  | { kind: 'draft'; postId: number; pointsEarned: number | null }
  | { kind: 'saved'; pointsEarned: number | null }
  /** A post in any other state: nothing to announce. */
  | { kind: 'silent' };

export function describeSaveOutcome(result: FinishResult): SaveOutcome {
  if (result.queued) {
    // No points or post to report yet — those exist only once the server has the
    // activity, and promising them here would be a lie half the time.
    return result.needsAttention
      ? { kind: 'queued-needs-attention', reason: result.needsAttention }
      : { kind: 'queued' };
  }

  const pointsEarned = result.points_earned ?? null;
  const post = result.post;
  if (!post) return { kind: 'saved', pointsEarned };
  if (post.status === 'published') return { kind: 'published', pointsEarned };
  if (post.status === 'draft') return { kind: 'draft', postId: post.id, pointsEarned };
  return { kind: 'silent' };
}
