import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ActivityBody } from '../FeedCard.ActivityBody';
import { makeSession } from '../strength/__tests__/fixture';
import type { Activity, Post } from '../../types/api';

jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../LeafletMap', () => ({ LazyRoutePreview: () => null }));
jest.mock('../FeedVideo', () => ({ FeedVideo: () => null }));
jest.mock('../MediaGrid', () => ({ MediaGrid: () => null }));
jest.mock('../AutoDisplayImage', () => ({ AutoDisplayImage: () => null }));
jest.mock('../ImageViewer', () => ({ ImageViewer: () => null }));
jest.mock('../ImageGallery', () => ({ ImageGallery: () => null }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ isDark: false, colors: jest.requireActual('../../theme/colors').lightColors }),
}));
jest.mock('../../hooks/useUnits', () => ({
  useUnits: () => ({
    formatDistance: (m: number) => `${m / 1000} km`,
    formatElevation: (m: number) => `${m} m`,
    units: 'metric',
  }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

const PROSE = 'Wiosłowanie sztangą: 55×8, 55×8, 50×8';

function makePost(activity: Partial<Activity>, content: string = PROSE): Post {
  return {
    id: 1,
    type: 'activity',
    title: null,
    content,
    activity: {
      id: 9,
      title: 'PULL',
      description: PROSE,
      distance: 0,
      duration: 2621,
      elevation_gain: 0,
      sport_type: { id: 5, name: 'Gym' },
      ...activity,
    },
  } as unknown as Post;
}

describe('ActivityBody — strength session', () => {
  it('replaces the auto description and the distance stats with the strength panel', () => {
    render(<ActivityBody post={makePost({ strength_session: makeSession() })} />);
    expect(screen.queryByText(PROSE)).toBeNull();
    expect(screen.getByText('activities.strength.liftedTotal')).toBeTruthy();
    expect(screen.getByText('activities.strength.setsLabel')).toBeTruthy();
    expect(screen.queryByText('activity.stats.distance')).toBeNull();
  });

  it("keeps a post text of the athlete's own", () => {
    render(<ActivityBody post={makePost({ strength_session: makeSession() }, 'Nowy rekord!')} />);
    expect(screen.getByText('Nowy rekord!')).toBeTruthy();
  });

  it('shows a description the athlete has edited', () => {
    render(
      <ActivityBody
        post={makePost({ strength_session: makeSession({ description_is_auto: false }) })}
      />,
    );
    expect(screen.getByText(PROSE)).toBeTruthy();
    expect(screen.getByText('activities.strength.liftedTotal')).toBeTruthy();
  });

  it('leaves other activities alone', () => {
    render(<ActivityBody post={makePost({})} />);
    expect(screen.getByText(PROSE)).toBeTruthy();
    expect(screen.getByText('activity.stats.distance')).toBeTruthy();
    expect(screen.queryByText('activities.strength.liftedTotal')).toBeNull();
  });
});
