import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useTeamActivityBoard } from '../useTeamActivityBoard';
import type { TeamBoardActivity } from '../../types/api';

jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockGetTeamActivities = jest.fn();
const mockGetTeamStats = jest.fn();
const mockGetTeamRanking = jest.fn();
jest.mock('../../services/api', () => ({
  api: {
    getTeamActivities: (...args: unknown[]) => mockGetTeamActivities(...args),
    getTeamStats: (...args: unknown[]) => mockGetTeamStats(...args),
    getTeamRanking: (...args: unknown[]) => mockGetTeamRanking(...args),
  },
}));

const sport = (id: number, name: string) => ({ id, name, slug: name, icon: null, is_active: true });

const activity = (id: number, sportId: number): TeamBoardActivity => ({
  id,
  title: `Run ${id}`,
  sport_type: sport(sportId, sportId === 1 ? 'Running' : 'Cycling'),
  started_at: '2026-11-03T10:00:00Z',
  duration: 1800,
  distance: 5000,
  elevation_gain: 20,
  likes_count: 0,
  comments_count: 0,
});

const page = (data: TeamBoardActivity[], current = 1, last = 1) => ({
  data,
  links: { first: '', last: '', prev: null, next: null },
  meta: {
    current_page: current,
    last_page: last,
    from: 1,
    to: data.length,
    path: '',
    per_page: 15,
    total: data.length,
  },
});

const weekStats = (distance: number) => ({
  team_id: 1,
  team_name: 'T',
  members_count: 3,
  period_label: 'this_week',
  all_time: {
    activities_count: 0,
    active_members: 0,
    total_distance: 0,
    total_duration: 0,
    total_elevation: 0,
    total_calories: 0,
    longest_distance: 0,
    longest_duration: 0,
    by_sport_type: [],
  },
  period: {
    activities_count: 2,
    active_members: 2,
    total_distance: distance,
    total_duration: 3600,
    total_elevation: 40,
    total_calories: 0,
    longest_distance: 0,
    longest_duration: 0,
    by_sport_type: [],
  },
});

const ranking = (distance: number) => ({
  team_id: 1,
  team_name: 'T',
  sort_by: 'distance',
  ranking: [
    {
      rank: 1,
      user: { id: 5, name: 'Ala', username: 'ala', avatar: null },
      activities_count: 2,
      total_distance: distance,
      total_duration: 0,
      total_elevation: 0,
      total_calories: 0,
    },
  ],
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTeamStats.mockResolvedValue(weekStats(10000));
  mockGetTeamRanking.mockResolvedValue(ranking(7000));
});

describe('useTeamActivityBoard', () => {
  it('loads the board, this week and the most active member, and derives sport chips', async () => {
    mockGetTeamActivities.mockResolvedValue(page([activity(1, 1), activity(2, 2), activity(3, 1)]));
    const { result } = renderHook(() => useTeamActivityBoard('team'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.week).not.toBeNull());

    expect(mockGetTeamActivities).toHaveBeenCalledWith('team', {
      page: 1,
      per_page: 15,
      sport_type_id: undefined,
    });
    expect(mockGetTeamStats).toHaveBeenCalledWith('team', 'this_week');
    expect(mockGetTeamRanking).toHaveBeenCalledWith('team', {
      period: 'this_week',
      sort_by: 'distance',
    });
    expect(result.current.activities.map((a) => a.id)).toEqual([1, 2, 3]);
    expect(result.current.sports.map((s) => s.name)).toEqual(['Running', 'Cycling']);
    expect(result.current.week?.total_distance).toBe(10000);
    expect(result.current.leader?.user.name).toBe('Ala');
    expect(result.current.isPrivate).toBe(false);
  });

  it('hides the most active member when nobody has distance this week', async () => {
    mockGetTeamActivities.mockResolvedValue(page([]));
    mockGetTeamRanking.mockResolvedValue(ranking(0));
    const { result } = renderHook(() => useTeamActivityBoard('team'));

    await waitFor(() => expect(result.current.week).not.toBeNull());
    expect(result.current.leader).toBeNull();
  });

  it('refetches with the sport filter and keeps the chips from the first page', async () => {
    mockGetTeamActivities.mockResolvedValue(page([activity(1, 1), activity(2, 2)]));
    const { result } = renderHook(() => useTeamActivityBoard('team'));
    await waitFor(() => expect(result.current.sports).toHaveLength(2));

    mockGetTeamActivities.mockResolvedValue(page([activity(2, 2)]));
    act(() => result.current.setSportTypeId(2));

    await waitFor(() =>
      expect(mockGetTeamActivities).toHaveBeenLastCalledWith('team', {
        page: 1,
        per_page: 15,
        sport_type_id: 2,
      }),
    );
    await waitFor(() => expect(result.current.activities.map((a) => a.id)).toEqual([2]));
    expect(result.current.sports).toHaveLength(2);
  });

  it('treats 403 as a private team and drops the week strip', async () => {
    mockGetTeamActivities.mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }));
    const { result } = renderHook(() => useTeamActivityBoard('team'));

    await waitFor(() => expect(result.current.isPrivate).toBe(true));
    expect(result.current.error).toBeNull();
    // The week requests start in parallel with the board; once the 403 is known
    // they are disabled and whatever they returned is discarded.
    await waitFor(() => expect(result.current.week).toBeNull());
    expect(result.current.leader).toBeNull();
  });

  it('fetches nothing while disabled', async () => {
    mockGetTeamActivities.mockResolvedValue(page([activity(1, 1)]));
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useTeamActivityBoard('team', { enabled }),
      { initialProps: { enabled: false } },
    );
    expect(mockGetTeamActivities).not.toHaveBeenCalled();
    expect(mockGetTeamStats).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await waitFor(() => expect(result.current.activities).toHaveLength(1));
  });
});
