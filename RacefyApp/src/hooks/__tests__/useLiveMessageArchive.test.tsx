import { renderHook, waitFor } from '@testing-library/react-native';

import { useLiveMessageArchive } from '../useLiveMessageArchive';
import { api } from '../../services/api';
import type { Activity, LiveMessage } from '../../types/api';

jest.mock('../../services/api', () => ({
  api: { getLiveMessages: jest.fn() },
}));

// useFetch pulls in the logger, which reaches for AsyncStorage at import time.
jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockedApi = api as unknown as { getLiveMessages: jest.Mock };

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 7,
    is_owner: true,
    live_started_at: '2026-08-26T06:00:00Z',
    ...overrides,
  } as Activity;
}

function message(id: number, visibility: 'public' | 'private'): LiveMessage {
  return {
    id,
    content: `msg ${id}`,
    created_at: '2026-08-26T06:10:00Z',
    live_visibility: visibility,
    is_live: true,
  } as LiveMessage;
}

describe('useLiveMessageArchive', () => {
  beforeEach(() => {
    mockedApi.getLiveMessages.mockReset();
    mockedApi.getLiveMessages.mockResolvedValue([]);
  });

  it('loads the messages of a finished broadcast and counts the private ones', async () => {
    mockedApi.getLiveMessages.mockResolvedValue([
      message(1, 'public'),
      message(2, 'private'),
      message(3, 'public'),
    ]);

    const { result } = renderHook(() => useLiveMessageArchive(activity()));

    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    expect(result.current.publicCount).toBe(2);
    expect(result.current.privateCount).toBe(1);
    // No `after` on the first page — the archive starts from the beginning.
    expect(mockedApi.getLiveMessages).toHaveBeenCalledWith(7, undefined);
  });

  it('walks past the first page instead of stopping at 50 messages', async () => {
    const firstPage = Array.from({ length: 50 }, (_, i) => message(i + 1, 'public'));
    mockedApi.getLiveMessages
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([message(51, 'private')]);

    const { result } = renderHook(() => useLiveMessageArchive(activity()));

    await waitFor(() => expect(result.current.messages).toHaveLength(51));
    // Second call continues after the highest id seen, not from the start.
    expect(mockedApi.getLiveMessages).toHaveBeenNthCalledWith(2, 7, 50);
    expect(result.current.privateCount).toBe(1);
  });

  it('does not call the API for an activity that was never broadcast', async () => {
    const { result } = renderHook(() => useLiveMessageArchive(activity({ live_started_at: null })));

    // Gated on `live_started_at`, so opening any ordinary activity costs nothing.
    expect(result.current.isAvailable).toBe(false);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockedApi.getLiveMessages).not.toHaveBeenCalled();
  });

  it('does not call the API for someone else’s activity', async () => {
    // The endpoint 404s for a non-owner once the broadcast ends; asking anyway
    // would only produce a guaranteed error.
    const { result } = renderHook(() => useLiveMessageArchive(activity({ is_owner: false })));

    expect(result.current.isAvailable).toBe(false);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockedApi.getLiveMessages).not.toHaveBeenCalled();
  });

  it('is unavailable while the activity is still loading', async () => {
    const { result } = renderHook(() => useLiveMessageArchive(null));

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.messages).toEqual([]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockedApi.getLiveMessages).not.toHaveBeenCalled();
  });

  it('surfaces a failure so the card can offer a retry', async () => {
    mockedApi.getLiveMessages.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useLiveMessageArchive(activity()));

    await waitFor(() => expect(result.current.error).toBe('network down'));
    expect(result.current.messages).toEqual([]);
  });
});
