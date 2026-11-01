import { mapLiveSendError } from '../sendErrors';

/** Errors carry `.status` (and sometimes `.error`), matching what the API base layer attaches. */
const apiError = (status: number, error?: string) =>
  Object.assign(new Error('nope'), { status, ...(error ? { error } : {}) });

describe('mapLiveSendError', () => {
  it('withdraws only the mic on live_voice_disabled', () => {
    expect(mapLiveSendError(apiError(403, 'live_voice_disabled'), 'voice')).toEqual({
      key: 'live.voice.disabled',
      disables: 'voice',
    });
  });

  it('withdraws the whole composer on live_comments_disabled, for either kind', () => {
    const expected = { key: 'live.messages.disabled', disables: 'comments' };
    expect(mapLiveSendError(apiError(403, 'live_comments_disabled'), 'text')).toEqual(expected);
    expect(mapLiveSendError(apiError(403, 'live_comments_disabled'), 'voice')).toEqual(expected);
    // Older backend: a bare 403 still means the athlete said no.
    expect(mapLiveSendError(apiError(403), 'text')).toEqual(expected);
  });

  it('tells voice 422 codes apart', () => {
    expect(mapLiveSendError(apiError(422, 'voice_too_long'), 'voice').key).toBe(
      'live.voice.tooLong',
    );
    expect(mapLiveSendError(apiError(422, 'voice_rejected'), 'voice').key).toBe(
      'live.voice.rejected',
    );
    expect(mapLiveSendError(apiError(422, 'voice_unreadable'), 'voice').key).toBe(
      'live.voice.unreadable',
    );
    expect(mapLiveSendError(apiError(422), 'voice').key).toBe('live.voice.unreadable');
  });

  it('keeps the text 422 meaning "too long"', () => {
    expect(mapLiveSendError(apiError(422), 'text').key).toBe('live.messages.tooLong');
  });

  it('shares the broadcast-level outcomes between kinds', () => {
    for (const kind of ['text', 'voice'] as const) {
      expect(mapLiveSendError(apiError(404), kind).key).toBe('live.messages.unavailable');
      expect(mapLiveSendError(apiError(429), kind).key).toBe('live.messages.throttled');
    }
  });

  it('falls back per kind for a network failure (no status at all)', () => {
    expect(mapLiveSendError(new Error('offline'), 'text').key).toBe('live.messages.sendFailed');
    expect(mapLiveSendError(new Error('offline'), 'voice').key).toBe('live.voice.sendFailed');
  });
});
