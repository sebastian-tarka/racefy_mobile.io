import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { SectionRenderer } from '../SectionRenderer';
import { getSectionWeather } from '../sections';
import type { HomeSection } from '../../../../../types/api';

// UpcomingEventsSection pulls the whole component barrel (and with it the API
// client and a pile of native modules). The backend never sends that section -
// it is UI-only - so stub it rather than booting half the app.
jest.mock('../sections/UpcomingEventsSection', () => ({
  UpcomingEventsSection: () => null,
}));

// The sections barrel reaches the API client, which boots i18n + storage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../../../../../services/homeAnalytics', () => ({
  homeAnalytics: { sectionViewed: jest.fn(), sectionCtaClicked: jest.fn() },
}));

jest.mock('../../../../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#10b981',
      cardBackground: '#fff',
      textPrimary: '#000',
      textSecondary: '#666',
      border: '#eee',
      info: '#3b82f6',
      success: '#22c55e',
      warning: '#f59e0b',
    },
  }),
}));

jest.mock('../../../../../hooks/useUnits', () => ({
  useUnits: () => ({
    units: 'metric',
    formatDistanceFromKm: (km: number) => `${km} km`,
    formatTemperature: (c: number) => `${c}°C`,
    getDistanceUnit: () => 'km',
  }),
}));

jest.mock('react-i18next', () => ({
  // Kept so the app's i18n bootstrap (pulled in via the API client) still works.
  initReactI18next: { type: '3rdParty', init: jest.fn() },
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

/**
 * Verbatim `/home/config` sections for an account with an active training
 * program (staging, 2026-08-28). Every one of these must reach the screen -
 * three of them used to be dropped silently.
 */
const STAGING_SECTIONS: HomeSection[] = [
  {
    type: 'weather_insight',
    priority: 2,
    title: 'Pochmurnie, 17°C',
    message: 'Idealne warunki do biegania.',
    cta: null,
    meta: { temperature: 17, condition: 'Clouds', feels_like: 16 },
  },
  {
    type: 'weekly_training_progress',
    priority: 3,
    title: 'Ten tydzień',
    message: '1 z 3 sesji ukończone.',
    cta: 'Przejrzyj plan',
    action: { type: 'view_training_week', payload: { training_week_id: 163 } },
    meta: { completed: 1, planned: 3, streak_weeks: 5 },
  },
  {
    type: 'friend_activity',
    priority: 4,
    title: 'Znajomy trenuje teraz',
    message: 'Dołącz do przyjaciela!',
    cta: 'Pokaż aktywność',
  },
  {
    type: 'training_goal_progress',
    priority: 5,
    title: 'Cel tygodniowy: 30 km',
    message: 'Przebiegłeś 4,9 km z 30 km.',
    cta: null,
    meta: {
      achieved_value: 4909,
      target_value: 30000,
      unit: 'meters',
      percent: 16,
      pace_status: 'behind',
      days_left: 3,
    },
  },
];

const callbacks = {
  onEventPress: jest.fn(),
  onActivityPress: jest.fn(),
  onSignIn: jest.fn(),
  onSignUp: jest.fn(),
  onStartActivity: jest.fn(),
  onCreatePost: jest.fn(),
  onFindEvents: jest.fn(),
  onSectionCtaPress: jest.fn(),
};

const renderSections = (sections: HomeSection[]) =>
  render(
    <SectionRenderer sections={sections} data={{}} callbacks={callbacks} isAuthenticated={true} />,
  );

describe('SectionRenderer', () => {
  it('renders every section the staging API returns', () => {
    renderSections(STAGING_SECTIONS);

    for (const section of STAGING_SECTIONS) {
      expect(screen.getByText(section.title)).toBeTruthy();
    }
  });

  it('renders weather values from meta, not just the AI-written title', () => {
    renderSections([STAGING_SECTIONS[0]]);

    expect(screen.getByText('17°C')).toBeTruthy();
    expect(screen.getByText('home.weather.feelsLike:{"value":"16°C"}')).toBeTruthy();
  });

  it('keeps a friend_activity card that carries no activity list', () => {
    renderSections([STAGING_SECTIONS[2]]);

    expect(screen.getByText('Znajomy trenuje teraz')).toBeTruthy();
  });

  it('derives the remaining sessions of a training week', () => {
    renderSections([STAGING_SECTIONS[1]]);

    expect(screen.getByText('home.training.sessionsDone:{"completed":1,"planned":3}')).toBeTruthy();
    expect(screen.getByText('home.training.streakWeeks:{"count":5}')).toBeTruthy();
  });

  it('formats goal progress from the SI value and its unit', () => {
    renderSections([STAGING_SECTIONS[3]]);

    expect(screen.getByText('4.91 km / 30.0 km')).toBeTruthy();
    expect(screen.getByText('home.training.pace.behind')).toBeTruthy();
  });

  it('skips unknown section types instead of crashing', () => {
    renderSections([{ type: 'brand_new_thing', priority: 1, title: 'Nope' } as any]);

    expect(screen.queryByText('Nope')).toBeNull();
  });
});

describe('getSectionWeather', () => {
  it('reads the payload the API sends in meta', () => {
    expect(getSectionWeather(STAGING_SECTIONS[0])).toMatchObject({
      temperature: 17,
      condition: 'Clouds',
    });
  });

  it('still accepts the older top-level weather field', () => {
    const section = {
      ...STAGING_SECTIONS[0],
      meta: undefined,
      weather: { temperature: 5, condition: 'Snow' },
    };
    expect(getSectionWeather(section)).toMatchObject({ temperature: 5, condition: 'Snow' });
  });
});
