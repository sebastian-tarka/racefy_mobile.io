import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TeamActivityBoardTab } from '../TeamActivityBoardTab';
import type { TeamActivityBoardState } from '../../../hooks/useTeamActivityBoard';
import type { TeamBoardActivity } from '../../../types/api';

const theme = () => ({ colors: new Proxy({}, { get: () => '#000' }), isDark: false });
const units = () => ({ formatDistanceShort: (m: number) => `${(m / 1000).toFixed(1)} km` });
jest.mock('../../../hooks', () => ({ useTheme: theme, useUnits: units }));
jest.mock('../../../hooks/useTheme', () => ({ useTheme: theme }));
jest.mock('../../../hooks/useHaptics', () => ({ triggerHaptic: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../../components', () => {
  const RN = jest.requireActual('react-native');
  return {
    Button: jest.requireActual('../../../components/Button').Button,
    Card: jest.requireActual('../../../components/Card').Card,
    EmptyState: jest.requireActual('../../../components/EmptyState').EmptyState,
    FilterChip: jest.requireActual('../../../components/FilterChip').FilterChip,
    TeamActivityRow: ({ activity }: { activity: { title: string } }) => (
      <RN.Text>{activity.title}</RN.Text>
    ),
  };
});
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && Object.keys(opts).length > 0
        ? `${key}(${Object.entries(opts)
            .map(([k, v]) => `${k}=${v}`)
            .join(',')})`
        : key,
  }),
}));

const activity = (id: number): TeamBoardActivity => ({
  id,
  title: `Run ${id}`,
  started_at: '2026-11-03T06:00:00Z',
  duration: 1800,
  distance: 5000,
  elevation_gain: 0,
  likes_count: 0,
  comments_count: 0,
});

const sport = (id: number, name: string) => ({ id, name, slug: name, icon: null, is_active: true });

const board = (overrides: Partial<TeamActivityBoardState> = {}): TeamActivityBoardState => ({
  week: {
    activities_count: 4,
    active_members: 2,
    total_distance: 42000,
    total_duration: 0,
    total_elevation: 0,
    total_calories: 0,
    longest_distance: 0,
    longest_duration: 0,
    by_sport_type: [],
  },
  leader: {
    rank: 1,
    user: { id: 5, name: 'Ala', username: 'ala', avatar: null },
    activities_count: 2,
    total_distance: 21000,
    total_duration: 0,
    total_elevation: 0,
    total_calories: 0,
  },
  activities: [activity(1), activity(2)],
  sports: [sport(1, 'Running'), sport(2, 'Cycling')],
  sportTypeId: null,
  setSportTypeId: jest.fn(),
  isPrivate: false,
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  hasMore: false,
  error: null,
  loadMore: jest.fn(),
  refresh: jest.fn(),
  ...overrides,
});

describe('TeamActivityBoardTab', () => {
  it('shows this week, the most active member, sport chips and the rows', () => {
    const state = board();
    render(<TeamActivityBoardTab board={state} onActivityPress={jest.fn()} />);

    expect(screen.getByText('42.0 km')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('teamBoard.mostActive(name=Ala,distance=21.0 km)')).toBeTruthy();
    expect(screen.getByText('Run 1')).toBeTruthy();
    expect(screen.getByText('Run 2')).toBeTruthy();

    fireEvent.press(screen.getByText('Cycling'));
    expect(state.setSportTypeId).toHaveBeenCalledWith(2);
    fireEvent.press(screen.getByText('teamBoard.allSports'));
    expect(state.setSportTypeId).toHaveBeenCalledWith(null);
  });

  it('hides the chips with a single sport and the leader without one', () => {
    render(
      <TeamActivityBoardTab
        board={board({ sports: [sport(1, 'Running')], leader: null })}
        onActivityPress={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('team-board-chips')).toBeNull();
    expect(screen.queryByTestId('team-board-leader')).toBeNull();
  });

  it('offers "show more" while there are more pages', () => {
    const state = board({ hasMore: true });
    render(<TeamActivityBoardTab board={state} onActivityPress={jest.fn()} />);
    fireEvent.press(screen.getByText('teamBoard.loadMore'));
    expect(state.loadMore).toHaveBeenCalled();
  });

  it('explains the empty list with the privacy note', () => {
    render(
      <TeamActivityBoardTab
        board={board({ activities: [], sports: [] })}
        onActivityPress={jest.fn()}
      />,
    );
    expect(screen.getByText('teamBoard.emptyTitle')).toBeTruthy();
    expect(screen.getByText('teamBoard.emptyDesc')).toBeTruthy();
    // the week strip still shows
    expect(screen.getByTestId('team-board-week')).toBeTruthy();
  });

  it('shows the private-team state instead of the board', () => {
    render(
      <TeamActivityBoardTab
        board={board({ isPrivate: true, activities: [], week: null })}
        onActivityPress={jest.fn()}
      />,
    );
    expect(screen.getByText('teams.statsPrivate')).toBeTruthy();
    expect(screen.queryByTestId('team-board')).toBeNull();
  });
});
