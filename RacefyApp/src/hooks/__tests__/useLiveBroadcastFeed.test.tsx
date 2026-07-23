import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useLiveBroadcastFeed } from '../useLiveBroadcastFeed';
import { api } from '../../services/api';
import type { LiveBroadcastDetailResponse, LivePosition } from '../../types/api';

jest.mock('../../services/api', () => ({
  api: {
    getLiveBroadcast: jest.fn(),
    getLiveMessages: jest.fn().mockResolvedValue([]),
  },
}));

// The real logger reaches for AsyncStorage at import time.
jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// The hook reads only `config.realtime`, so a minimal stub keeps the test
// independent of the real provider's network fetch.
jest.mock('../../contexts/AppConfigContext', () => ({
  useAppConfig: () => ({
    config: { realtime: { driver: 'polling', poll_interval_ms: 5000, reverb: null } },
  }),
}));

const mockedApi = api as unknown as {
  getLiveBroadcast: jest.Mock;
  getLiveMessages: jest.Mock;
};

/** Minimal snapshot payload — the hook only reads position/stats/status. */
function snapshot(position: LivePosition): LiveBroadcastDetailResponse {
  const stats = {
    distance: 100,
    duration: 60,
    elevation_gain: 5,
    avg_speed: '3.20',
    current_pace: null,
  };
  return {
    data: { position, stats } as any,
    snapshot: { position, stats, status: 'in_progress' } as any,
  };
}

describe('useLiveBroadcastFeed', () => {
  beforeEach(() => {
    // mockReset, not clearAllMocks: the latter keeps queued `mockResolvedValueOnce`
    // values, which would leak an unconsumed snapshot into the next test.
    mockedApi.getLiveBroadcast.mockReset();
    mockedApi.getLiveMessages.mockReset();
    mockedApi.getLiveMessages.mockResolvedValue([]);
  });

  it('stitches the trail from positions that arrive while watching', async () => {
    mockedApi.getLiveBroadcast
      .mockResolvedValueOnce(snapshot([19.94, 50.06]))
      .mockResolvedValueOnce(snapshot([19.941, 50.061]));

    const { result } = renderHook(() => useLiveBroadcastFeed(213, { withMessages: false }));

    await waitFor(() => expect(result.current.trail).toHaveLength(1));
    // Trail points are {lng, lat} — guards against a silent [lat, lng] swap.
    expect(result.current.trail[0]).toEqual({ lng: 19.94, lat: 50.06 });
  });

  it('does not append a duplicate point when the athlete has not moved', async () => {
    // Both transports return a fresh object every tick even when stationary.
    mockedApi.getLiveBroadcast.mockResolvedValue(snapshot([19.94, 50.06]));

    const { result } = renderHook(() => useLiveBroadcastFeed(213, { withMessages: false }));

    await waitFor(() => expect(result.current.trail).toHaveLength(1));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.trail).toHaveLength(1);
  });

  it('skips null positions instead of bridging across a privacy zone', async () => {
    mockedApi.getLiveBroadcast
      .mockResolvedValueOnce(snapshot([19.94, 50.06]))
      .mockResolvedValueOnce(snapshot(null));

    const { result } = renderHook(() => useLiveBroadcastFeed(213, { withMessages: false }));
    await waitFor(() => expect(result.current.trail).toHaveLength(1));

    // A hidden position must never extend the line, and must never fall back
    // to the last known point.
    expect(result.current.trail).toHaveLength(1);
  });

  it('treats a missing broadcast as ended rather than an error', async () => {
    mockedApi.getLiveBroadcast.mockResolvedValue(null);

    const { result } = renderHook(() => useLiveBroadcastFeed(213, { withMessages: false }));

    await waitFor(() => expect(result.current.status).toBe('ended'));
    expect(result.current.error).toBeNull();
  });
});
