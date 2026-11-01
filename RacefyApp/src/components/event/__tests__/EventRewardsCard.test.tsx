import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { EventRewardsCard } from '../EventRewardsCard';
import type { Event, EventCoupon } from '../../../types/api';

// eventFormat reaches config/api, which pulls in the logger and its storage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: new Proxy({}, { get: () => '#000' }),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

// The icon font loads asynchronously and updates state outside act().
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && 'defaultValue' in opts) return opts.defaultValue as string;
      return opts?.count != null ? `${key}:${opts.count}` : key;
    },
  }),
}));

const coupon = (id: number, place: number, title: string, code: string | null = null) =>
  ({
    id,
    place,
    title,
    description: null,
    discount_type: 'fixed',
    discount_value: null,
    currency: 'PLN',
    promoted_link: 'https://shop.example/x',
    expires_at: null,
    code_locked: code == null,
    code,
  }) as EventCoupon;

const event = (coupons: EventCoupon[]) =>
  ({
    ranking_mode: 'most_distance',
    point_rewards: { first_place: 300, second_place: 200, third_place: 100, finisher: 20 },
    prizes: [],
    coupons,
  }) as unknown as Event;

describe('EventRewardsCard', () => {
  it('keeps every coupon of a place and puts place 0 on the finisher line', () => {
    render(
      <EventRewardsCard
        event={event([coupon(10, 0, '-20 zł'), coupon(7, 0, '-200 zł'), coupon(8, 0, '-100 zł')])}
      />,
    );

    // First coupon on the line, the other two counted — none dropped, no "0." place.
    expect(screen.getByText('-20 zł')).toBeTruthy();
    expect(screen.getByText('events.rewards.moreCount:2')).toBeTruthy();
    expect(screen.queryByText('0.')).toBeNull();
    expect(screen.getByText('events.rewards.finisher')).toBeTruthy();
    expect(screen.getByText('events.rewards.showAll:3')).toBeTruthy();
  });

  it('lists all rewards in the sheet, with the code only once it is won', () => {
    render(
      <EventRewardsCard
        event={event([coupon(10, 0, '-20 zł', 'ARM20'), coupon(7, 0, '-200 zł')])}
      />,
    );

    fireEvent.press(screen.getByText('events.rewards.showAll:2'));

    expect(screen.getByText('events.rewards.sheetTitle')).toBeTruthy();
    expect(screen.getAllByText('-200 zł').length).toBeGreaterThan(0);
    expect(screen.getByText('ARM20')).toBeTruthy();
    expect(screen.getByText('events.rewards.codeLocked')).toBeTruthy();
  });

  it('shows no "more" link when every place has a single reward', () => {
    render(<EventRewardsCard event={event([coupon(1, 1, 'Winner code')])} />);

    expect(screen.getByText('Winner code')).toBeTruthy();
    expect(screen.queryByText(/events\.rewards\.showAll/)).toBeNull();
    expect(screen.queryByText(/events\.rewards\.moreCount/)).toBeNull();
  });
});
