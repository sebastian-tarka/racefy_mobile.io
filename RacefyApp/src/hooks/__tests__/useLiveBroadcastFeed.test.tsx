import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useLiveBroadcastFeed } from '../useLiveBroadcastFeed';
import { api } from '../../services/api';
import type { LiveBroadcastDetailResponse, LivePosition, LiveTrack } from '../../types/api';

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
const POLL_INTERVAL_MS = 5000;

jest.mock('../../contexts/AppConfigContext', () => ({
  useAppConfig: () => ({
    config: { realtime: { driver: 'polling', poll_interval_ms: 5000, reverb: null } },
  }),
}));

const mockedApi = api as unknown as {
  getLiveBroadcast: jest.Mock;
  getLiveMessages: jest.Mock;
};

/** Minimal snapshot payload — the hook only reads position/stats/status/track. */
function snapshot(position: LivePosition, track?: LiveTrack | null): LiveBroadcastDetailResponse {
  const stats = {
    distance: 100,
    duration: 60,
    elevation_gain: 5,
    avg_speed: '3.20',
    current_pace: null,
  };
  return {
    data: { position, stats } as any,
    snapshot: { position, stats, status: 'in_progress', track } as any,
  };
}

/** Two pieces of route, as the API sends them once a privacy zone cut the line. */
const TWO_SEGMENT_TRACK: LiveTrack = {
  type: 'MultiLineString',
  coordinates: [
    [
      [19.9, 50.0],
      [19.91, 50.01],
    ],
    [
      [19.95, 50.05],
      [19.96, 50.06],
    ],
  ],
};

/**
 * Drives the polling transport one interval forward. Needs fake timers, which
 * the tests that use it turn on themselves — switching the whole file over
 * would make the plain `waitFor` cases depend on timer plumbing they don't use.
 */
async function advanceOnePoll() {
  await act(async () => {
    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await Promise.resolve();
  });
}

describe('useLiveBroadcastFeed', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

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

  it('seeds the trail with the route covered before the spectator joined', async () => {
    mockedApi.getLiveBroadcast.mockResolvedValue(snapshot([19.96, 50.06], TWO_SEGMENT_TRACK));

    const { result } = renderHook(() => useLiveBroadcastFeed(213, { withMessages: false }));

    // 4 seeded points and no 5th: the live position already ends the track, so
    // appending it again would double the last point.
    await waitFor(() => expect(result.current.trail).toHaveLength(4));
    expect(result.current.trail[0]).toEqual({ lng: 19.9, lat: 50.0 });
  });

  it('marks the start of each seeded segment so the map keeps privacy gaps apart', async () => {
    mockedApi.getLiveBroadcast.mockResolvedValue(snapshot([19.96, 50.06], TWO_SEGMENT_TRACK));

    const { result } = renderHook(() => useLiveBroadcastFeed(213, { withMessages: false }));
    await waitFor(() => expect(result.current.trail).toHaveLength(4));

    // Only the second segment breaks: a break on the very first point would
    // split off an empty piece.
    expect(result.current.trail.map((p) => !!p.segmentBreak)).toEqual([false, false, true, false]);
  });

  it('asks for the track on the first poll and never again', async () => {
    jest.useFakeTimers();
    mockedApi.getLiveBroadcast
      .mockResolvedValueOnce(snapshot([19.9, 50.0], TWO_SEGMENT_TRACK))
      .mockResolvedValue(snapshot([19.97, 50.07]));

    renderHook(() => useLiveBroadcastFeed(213, { withMessages: false }));
    await waitFor(() => expect(mockedApi.getLiveBroadcast).toHaveBeenCalledTimes(1));

    await advanceOnePoll();
    await waitFor(() => expect(mockedApi.getLiveBroadcast).toHaveBeenCalledTimes(2));

    // The track dwarfs the snapshot and this endpoint is polled every few
    // seconds — re-requesting it per tick is the expensive mistake here.
    expect(mockedApi.getLiveBroadcast).toHaveBeenNthCalledWith(1, 213, { includeTrack: true });
    expect(mockedApi.getLiveBroadcast).toHaveBeenNthCalledWith(2, 213, { includeTrack: false });
  });

  it('keeps the seeded trail when later ticks carry no track', async () => {
    jest.useFakeTimers();
    mockedApi.getLiveBroadcast
      .mockResolvedValueOnce(snapshot([19.96, 50.06], TWO_SEGMENT_TRACK))
      .mockResolvedValue(snapshot([19.97, 50.07]));

    const { result } = renderHook(() => useLiveBroadcastFeed(213, { withMessages: false }));
    await waitFor(() => expect(result.current.trail).toHaveLength(4));

    await advanceOnePoll();
    // The trackless tick extends the trail instead of replacing it: by now the
    // trail holds live points no snapshot knows about, so a reset loses them.
    await waitFor(() => expect(result.current.trail).toHaveLength(5));
    expect(result.current.trail[0]).toEqual({ lng: 19.9, lat: 50.0 });
  });

  it('treats a missing broadcast as ended rather than an error', async () => {
    mockedApi.getLiveBroadcast.mockResolvedValue(null);

    const { result } = renderHook(() => useLiveBroadcastFeed(213, { withMessages: false }));

    await waitFor(() => expect(result.current.status).toBe('ended'));
    expect(result.current.error).toBeNull();
  });
});
