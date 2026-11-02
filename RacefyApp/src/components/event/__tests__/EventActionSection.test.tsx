import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { EventActionSection } from '../EventActionSection';
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
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../recording/LivePulse', () => ({ LivePulse: () => null }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown> | string) => {
      if (typeof opts === 'string') return opts;
      if (opts && 'defaultValue' in opts) return opts.defaultValue as string;
      return key;
    },
  }),
}));

const event = (overrides: Partial<Event>): Event =>
  ({
    id: 41,
    status: 'ongoing',
    starts_at: '2026-11-02T08:00:00Z',
    entry_fee: 0,
    is_owner: false,
    is_registered: false,
    ...overrides,
  }) as unknown as Event;

const baseProps = {
  isAuthenticated: true,
  canRegister: false,
  canCancel: false,
  isRegistering: false,
  onRegister: jest.fn(),
  onCancelRegistration: jest.fn(),
  registrationClosedMessage: 'closed because',
  isWatching: false,
  isWatchToggling: false,
  canWatch: false,
  onToggleWatch: jest.fn(),
  ownerActions: [],
};

describe('EventActionSection', () => {
  it('offers registration on an ongoing event when the API says one can still join', () => {
    render(
      <EventActionSection
        {...baseProps}
        event={event({
          registration_eligibility: { can_register: true, reason: null },
        } as Partial<Event>)}
        canRegister
      />,
    );

    expect(screen.getByText('Register · Free')).toBeTruthy();
    expect(screen.getByText('This event is in progress — you can still join')).toBeTruthy();
    expect(screen.queryByText('Registration closed')).toBeNull();
  });

  it('still says closed on an ongoing event when registration really is closed', () => {
    render(
      <EventActionSection
        {...baseProps}
        event={event({
          registration_eligibility: { can_register: false, reason: 'registration_closed' },
        } as Partial<Event>)}
      />,
    );

    expect(screen.getByText('Registration closed')).toBeTruthy();
    expect(screen.getByText('closed because')).toBeTruthy();
    expect(screen.queryByText('Register · Free')).toBeNull();
  });

  it('offers sign-in to a guest on an ongoing event with open registration', () => {
    render(
      <EventActionSection
        {...baseProps}
        isAuthenticated={false}
        event={event({
          registration_eligibility: { can_register: true, reason: null },
        } as Partial<Event>)}
      />,
    );

    expect(screen.getByText('Sign in to register')).toBeTruthy();
  });

  it('shows "Start activity" once registered during the event', () => {
    render(
      <EventActionSection
        {...baseProps}
        event={event({ is_registered: true })}
        startCta={{ recording: false, onStart: jest.fn(), onResume: jest.fn(), onBusy: jest.fn() }}
      />,
    );

    expect(screen.getByText("You're registered")).toBeTruthy();
    expect(screen.getByText('eventPin.startActivity')).toBeTruthy();
  });

  it('keeps a completed event closed', () => {
    render(
      <EventActionSection {...baseProps} event={event({ status: 'completed' })} canRegister />,
    );

    expect(screen.getByText('Registration closed')).toBeTruthy();
    expect(screen.queryByText('Register · Free')).toBeNull();
  });
});
