import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { EventInfoGrid } from '../EventInfoGrid';
import type { Event } from '../../../types/api';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }) }),
}));
jest.mock('../../../hooks/useUnits', () => ({
  useUnits: () => ({
    formatDistanceShort: (m: number) => `${m} m`,
    formatElevation: (m: number) => `${m} m`,
  }),
}));
jest.mock('../../../hooks/useFeatureFlags', () => ({ useFeatureFlags: () => ({}) }));
jest.mock('../../../utils/timezone', () => ({
  ...jest.requireActual('../../../utils/timezone'),
  getDeviceTimeZone: () => 'Europe/Warsaw',
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown> | string) => {
      if (typeof opts === 'string') return opts;
      if (key === 'eventInfo.localTime' && opts) return `local ${opts.time} (${opts.city})`;
      if (opts && 'defaultValue' in opts) return opts.defaultValue as string;
      return key;
    },
  }),
}));

const event = (overrides: Partial<Event>): Event =>
  ({
    id: 1,
    starts_at: '2026-10-15T14:00:00.000Z', // 16:00 in Warsaw, 10:00 in New York
    ends_at: '2026-10-15T16:00:00.000Z',
    difficulty: 'all_levels',
    ranking_mode: 'fastest_time',
    ...overrides,
  }) as unknown as Event;

describe('EventInfoGrid local time line', () => {
  it("shows the event's own time when its zone reads differently from the device", () => {
    render(<EventInfoGrid event={event({ timezone: 'America/New_York' })} />);
    const line = screen.getByTestId('event-local-time');
    expect(line.props.children).toContain('10:00');
    expect(line.props.children).toContain('(New York)');
  });

  it('shows nothing when the event is in the device zone or has no zone', () => {
    render(<EventInfoGrid event={event({ timezone: 'Europe/Warsaw' })} />);
    expect(screen.queryByTestId('event-local-time')).toBeNull();
    render(<EventInfoGrid event={event({})} />);
    expect(screen.queryByTestId('event-local-time')).toBeNull();
  });
});
