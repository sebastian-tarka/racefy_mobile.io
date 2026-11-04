import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { LiveMyPlaceCard } from '../LiveMyPlaceCard';
import { LiveSpectatorCard } from '../LiveSpectatorCard';
import { LiveCheerCard } from '../LiveCheerCard';
import { EventResultCard } from '../EventResultCard';
import { normalizeIndividualStanding } from '../../../utils/eventStandings';
import type { Event, EventStandingEntry, EventViewerResult } from '../../../types/api';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }), isDark: false }),
}));
jest.mock('../../../hooks/useUnits', () => ({
  useUnits: () => ({
    formatDistanceShort: (m: number) => `${(m / 1000).toFixed(1)} km`,
    formatElevation: (m: number) => `${m} m`,
    formatPaceWithUnit: () => '5:00 /km',
  }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../recording/LivePulse', () => ({ LivePulse: () => null }));
jest.mock('../../Avatar', () => ({ Avatar: () => null }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (typeof opts === 'string') return opts;
      if (opts && 'defaultValue' in opts) return opts.defaultValue as string;
      if (opts && Object.keys(opts).length > 0) {
        return `${key}(${Object.entries(opts)
          .map(([k, v]) => `${k}=${v}`)
          .join(',')})`;
      }
      return key;
    },
  }),
}));

const standing = (
  id: number,
  position: number,
  overrides: Partial<EventStandingEntry> = {},
): EventStandingEntry => ({
  position,
  user: { id, name: `User ${id}`, username: `u${id}` },
  activity: { id: id * 10, distance: 10000, duration: 3600, elevation_gain: 100 },
  is_finished: false,
  is_recording: false,
  live: null,
  ...overrides,
});

const event = (overrides: Partial<Event> = {}): Event =>
  ({
    id: 41,
    ranking_mode: 'most_distance',
    target_distance: 20000,
    allow_multiple_activities: true,
    user_registration: { registration_number: 7 },
    ...overrides,
  }) as unknown as Event;

const cta = () => ({
  recording: false,
  onStart: jest.fn(),
  onResume: jest.fn(),
  onBusy: jest.fn(),
});

describe('LiveMyPlaceCard', () => {
  it('shows the bib, the position with the metric and the gap to the person ahead', () => {
    const rows = [
      standing(1, 1, { activity: { id: 10, distance: 15000, duration: 1, elevation_gain: 0 } }),
      standing(2, 2, { activity: { id: 20, distance: 12000, duration: 1, elevation_gain: 0 } }),
    ].map(normalizeIndividualStanding);
    render(
      <LiveMyPlaceCard
        event={event()}
        rows={rows}
        rankingMode="most_distance"
        me={rows[1]}
        cta={cta()}
      />,
    );
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('eventLive.me.position(n=2,metric=12.0 km)')).toBeTruthy();
    expect(screen.getByText('eventLive.me.behindMetric(amount=3.0 km,place=1)')).toBeTruthy();
    // progress to the 20 km target
    expect(screen.getByText('eventLive.me.goalOf(goal=20.0 km)')).toBeTruthy();
  });

  it('offers Start when the viewer has no activity yet', () => {
    const c = cta();
    render(
      <LiveMyPlaceCard event={event()} rows={[]} rankingMode="most_distance" me={null} cta={c} />,
    );
    expect(screen.getByText("You haven't started yet")).toBeTruthy();
    fireEvent.press(screen.getByText('eventPin.startActivity'));
    expect(c.onStart).toHaveBeenCalled();
  });

  it('turns into "back to recording" while something is recording', () => {
    const c = { ...cta(), recording: true };
    render(
      <LiveMyPlaceCard event={event()} rows={[]} rankingMode="most_distance" me={null} cta={c} />,
    );
    fireEvent.press(screen.getByText('eventPin.backToActivity'));
    expect(c.onResume).toHaveBeenCalled();
    fireEvent.press(screen.getByText('eventPin.startActivity →'));
    expect(c.onBusy).toHaveBeenCalled();
  });

  it('hides Start once the single allowed activity is finished', () => {
    const rows = [standing(1, 1, { is_finished: true })].map(normalizeIndividualStanding);
    render(
      <LiveMyPlaceCard
        event={event({ allow_multiple_activities: false })}
        rows={rows}
        rankingMode="most_distance"
        me={rows[0]}
        cta={cta()}
      />,
    );
    expect(screen.queryByText('eventPin.startActivity')).toBeNull();
  });
});

describe('LiveSpectatorCard', () => {
  const base = {
    isTeamEvent: false,
    isJoining: false,
    onJoin: jest.fn(),
    isWatching: false,
    isWatchToggling: false,
    onToggleWatch: jest.fn(),
  };

  it('offers Join and Watch while registration is open', () => {
    render(<LiveSpectatorCard {...base} canJoin />);
    fireEvent.press(screen.getByTestId('live-spectator-join'));
    expect(base.onJoin).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('live-spectator-watch'));
    expect(base.onToggleWatch).toHaveBeenCalled();
  });

  it('only offers Watch when registration is closed', () => {
    render(<LiveSpectatorCard {...base} canJoin={false} isWatching />);
    expect(screen.queryByTestId('live-spectator-join')).toBeNull();
    expect(screen.getByText('Watching')).toBeTruthy();
  });
});

describe('LiveCheerCard', () => {
  it('lists athletes on course with a watchable broadcast, skipping the viewer', () => {
    const onCheer = jest.fn();
    const rows = [
      standing(1, 1, { is_recording: true, live: { activity_id: 10 } }),
      standing(2, 2, { is_recording: true, live: { activity_id: 20 } }),
      standing(3, 3, { is_recording: true, live: null }),
      standing(4, 4, { is_finished: true }),
    ].map(normalizeIndividualStanding);
    render(<LiveCheerCard rows={rows} currentUserId={2} onCheer={onCheer} />);
    expect(screen.getByText('User 1')).toBeTruthy();
    expect(screen.queryByText('User 2')).toBeNull();
    expect(screen.queryByText('User 3')).toBeNull();
    fireEvent.press(screen.getByTestId('cheer-10'));
    expect(onCheer).toHaveBeenCalledWith(10);
    // one more on course without a broadcast
    expect(screen.getByText('eventLive.cheer.more(count=1)')).toBeTruthy();
  });

  it('renders nothing when nobody is on course', () => {
    const rows = [standing(1, 1, { is_finished: true })].map(normalizeIndividualStanding);
    render(<LiveCheerCard rows={rows} currentUserId={9} onCheer={jest.fn()} />);
    expect(screen.queryByTestId('live-cheer')).toBeNull();
  });
});

describe('EventResultCard', () => {
  const finished = (overrides: Partial<EventViewerResult> = {}): EventViewerResult => ({
    state: 'finished',
    provisional: false,
    place: 12,
    participants_ranked: 46,
    registration_number: 142,
    team: null,
    metrics: { distance: 10000, duration: 3000, elevation_gain: 120, activities_count: 1 },
    activity_id: 500,
    reason: null,
    points_awarded: 120,
    badges: [],
    is_personal_record: true,
    ...overrides,
  });

  it('shows place of N, the record and points, and offers share + activity', () => {
    const onShare = jest.fn();
    const onView = jest.fn();
    render(
      <EventResultCard
        result={finished()}
        rankingMode="fastest_time"
        onShare={onShare}
        onViewActivity={onView}
      />,
    );
    expect(screen.getByText('142')).toBeTruthy();
    expect(screen.getByText('eventResult.placeOf(place=12,total=46)')).toBeTruthy();
    expect(screen.getByText('Personal record')).toBeTruthy();
    expect(screen.getByText('eventResult.points(n=120)')).toBeTruthy();
    fireEvent.press(screen.getByTestId('event-result-share'));
    expect(onShare).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('event-result-view-activity'));
    expect(onView).toHaveBeenCalledWith(500);
  });

  it('says points come later while provisional', () => {
    render(
      <EventResultCard
        result={finished({ provisional: true, points_awarded: null })}
        rankingMode="fastest_time"
        onShare={jest.fn()}
      />,
    );
    expect(screen.getByText('YOUR RESULT · PROVISIONAL')).toBeTruthy();
    expect(screen.getByText('Points after approval')).toBeTruthy();
  });

  it('shows the DNF reason and no share for a DNF', () => {
    render(
      <EventResultCard
        result={finished({ state: 'dnf', place: null, reason: 'time_limit', points_awarded: null })}
        rankingMode="fastest_time"
        onShare={jest.fn()}
      />,
    );
    expect(screen.getByText('Did not finish')).toBeTruthy();
    expect(screen.getByText('eventResult.reason.time_limit')).toBeTruthy();
    expect(screen.queryByTestId('event-result-share')).toBeNull();
  });
});
