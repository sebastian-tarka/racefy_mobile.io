import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TeamActivityRow } from '../TeamActivityRow';
import type { TeamBoardActivity } from '../../types/api';

jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return { Image: (props: object) => <View testID="route-preview" {...props} /> };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../Avatar', () => ({ Avatar: () => null }));
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }), isDark: false }),
}));
jest.mock('../../hooks/useUnits', () => ({
  useUnits: () => ({
    formatDistanceShort: (m: number) => `${(m / 1000).toFixed(1)} km`,
    formatElevation: (m: number) => `${m} m`,
    formatPaceWithUnit: (m: number, s: number) => `${(s / 60 / (m / 1000)).toFixed(0)}:00 /km`,
  }),
}));
jest.mock('../../utils/dateFormat', () => ({ formatTimeAgo: () => '2 hours ago' }));
jest.mock('../../config/api', () => ({ fixStorageUrl: (u: string | null) => u }));
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

const base = (overrides: Partial<TeamBoardActivity> = {}): TeamBoardActivity => ({
  id: 7,
  title: 'Morning run',
  sport_type: { id: 1, name: 'Running', slug: 'running', icon: null, is_active: true },
  started_at: '2026-11-03T06:00:00Z',
  duration: 1800,
  moving_time: 1500,
  distance: 5000,
  elevation_gain: 42,
  formatted: { pace: { value: '5:00', unit: 'min/km' } },
  likes_count: 3,
  comments_count: 1,
  user: { id: 5, name: 'Ala', username: 'ala' } as TeamBoardActivity['user'],
  route_preview_url: 'https://cdn/route.png',
  ...overrides,
});

describe('TeamActivityRow', () => {
  it('shows who, what, when and the numbers, and opens the activity', () => {
    const onPress = jest.fn();
    render(<TeamActivityRow activity={base()} onPress={onPress} />);

    expect(screen.getByText('Ala')).toBeTruthy();
    expect(screen.getByText('Running · 2 hours ago')).toBeTruthy();
    expect(screen.getByText('Morning run')).toBeTruthy();
    expect(screen.getByText('5.0 km')).toBeTruthy();
    expect(screen.getByText('30m')).toBeTruthy();
    // pace from moving time (1500 s over 5 km), in the user's units
    expect(screen.getByText('5:00 /km')).toBeTruthy();
    expect(screen.getByText('↗ 42 m')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByTestId('route-preview')).toBeTruthy();

    fireEvent.press(screen.getByTestId('team-activity-7'));
    expect(onPress).toHaveBeenCalledWith(7);
  });

  it('skips pace when the API says it does not apply, and the thumbnail without a route', () => {
    render(
      <TeamActivityRow
        activity={base({
          formatted: { pace: { value: null, unit: 'min/km' } },
          route_preview_url: null,
          route_map_url: null,
          likes_count: 0,
          comments_count: 0,
          elevation_gain: null,
        })}
        onPress={jest.fn()}
      />,
    );
    expect(screen.queryByText(/\/km$/)).toBeNull();
    expect(screen.queryByTestId('route-preview')).toBeNull();
    expect(screen.queryByText(/↗/)).toBeNull();
  });
});
