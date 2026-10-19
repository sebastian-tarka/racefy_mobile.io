import { describeSaveOutcome } from '../saveOutcome';
import type { FinishResult } from '../../../../hooks/useLiveActivity';

const activity = { id: 7 } as any;

describe('describeSaveOutcome', () => {
  it('queued in the outbox', () => {
    expect(describeSaveOutcome({ queued: true, activityId: 7 })).toEqual({ kind: 'queued' });
  });

  it('queued but refused by the server', () => {
    expect(
      describeSaveOutcome({ queued: true, activityId: 7, needsAttention: 'too short' }),
    ).toEqual({ kind: 'queued-needs-attention', reason: 'too short' });
  });

  it('saved without a post, with and without points', () => {
    expect(describeSaveOutcome({ activity, points_earned: 12 })).toEqual({
      kind: 'saved',
      pointsEarned: 12,
    });
    expect(describeSaveOutcome({ activity })).toEqual({ kind: 'saved', pointsEarned: null });
  });

  it('published post', () => {
    const result = { activity, post: { id: 3, status: 'published' }, points_earned: 0 };
    expect(describeSaveOutcome(result as FinishResult)).toEqual({
      kind: 'published',
      pointsEarned: 0,
    });
  });

  it('draft post carries its id for "View draft"', () => {
    const result = { activity, post: { id: 3, status: 'draft' } };
    expect(describeSaveOutcome(result as FinishResult)).toEqual({
      kind: 'draft',
      postId: 3,
      pointsEarned: null,
    });
  });

  it('a post in any other state says nothing (as before)', () => {
    const result = { activity, post: { id: 3, status: 'processing' } };
    expect(describeSaveOutcome(result as FinishResult)).toEqual({ kind: 'silent' });
  });
});
