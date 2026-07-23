import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useLiveMessaging } from '../useLiveMessaging';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
  api: { sendLiveMessage: jest.fn() },
}));

jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockedApi = api as unknown as { sendLiveMessage: jest.Mock };

/** Errors carry `.status`, matching what the API base layer attaches. */
const apiError = (status: number, message = 'nope') =>
  Object.assign(new Error(message), { status });

describe('useLiveMessaging', () => {
  beforeEach(() => mockedApi.sendLiveMessage.mockReset());

  it('sends a trimmed message and reports success', async () => {
    mockedApi.sendLiveMessage.mockResolvedValue({ id: 1, content: 'Go!' });
    const { result } = renderHook(() => useLiveMessaging(42));

    await act(async () => {
      await result.current.send('  Go!  ', false);
    });

    expect(mockedApi.sendLiveMessage).toHaveBeenCalledWith(42, { content: 'Go!', public: false });
  });

  it('refuses to send an empty message without calling the API', async () => {
    const { result } = renderHook(() => useLiveMessaging(42));

    await act(async () => {
      await result.current.send('   ', false);
    });

    expect(mockedApi.sendLiveMessage).not.toHaveBeenCalled();
  });

  it('rejects over-long messages locally rather than relying on the 422', async () => {
    const { result } = renderHook(() => useLiveMessaging(42));

    await act(async () => {
      await result.current.send('x'.repeat(281), false);
    });

    expect(mockedApi.sendLiveMessage).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.errorKey).toBe('live.messages.tooLong'));
  });

  it('latches commentsDisabled on the live_comments_disabled code', async () => {
    mockedApi.sendLiveMessage.mockRejectedValue(
      Object.assign(new Error('This athlete has disabled live messages.'), {
        status: 403,
        error: 'live_comments_disabled',
      }),
    );
    const { result } = renderHook(() => useLiveMessaging(42));

    await act(async () => {
      await result.current.send('hi', false);
    });

    await waitFor(() => expect(result.current.commentsDisabled).toBe(true));
    expect(result.current.errorKey).toBe('live.messages.disabled');
  });

  it('still latches on a bare 403, for responses without an error code', async () => {
    mockedApi.sendLiveMessage.mockRejectedValue(
      apiError(403, 'This athlete has disabled live messages.'),
    );
    const { result } = renderHook(() => useLiveMessaging(42));

    await act(async () => {
      await result.current.send('hi', false);
    });

    await waitFor(() => expect(result.current.commentsDisabled).toBe(true));
    expect(result.current.errorKey).toBe('live.messages.disabled');
  });

  it.each([
    [404, 'live.messages.unavailable'],
    [422, 'live.messages.tooLong'],
    [429, 'live.messages.throttled'],
    [500, 'live.messages.sendFailed'],
  ])('maps status %i to %s', async (status, expectedKey) => {
    mockedApi.sendLiveMessage.mockRejectedValue(apiError(status));
    const { result } = renderHook(() => useLiveMessaging(42));

    await act(async () => {
      await result.current.send('hi', false);
    });

    await waitFor(() => expect(result.current.errorKey).toBe(expectedKey));
    // Only a 403 may hide the composer — a rate limit or a network blip must not.
    expect(result.current.commentsDisabled).toBe(false);
  });
});
