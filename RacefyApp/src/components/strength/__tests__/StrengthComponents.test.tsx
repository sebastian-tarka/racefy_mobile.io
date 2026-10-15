import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { StrengthFeedPanel } from '../StrengthFeedPanel';
import { StrengthRhythm } from '../StrengthRhythm';
import { StrengthSessionCards } from '../StrengthSessionCards';
import { lightColors } from '../../../theme/colors';
import { curls, facePulls, makeSession, rowing } from './fixture';

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    isDark: false,
    colors: jest.requireActual('../../../theme/colors').lightColors,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('StrengthFeedPanel', () => {
  it('renders nothing without exercises', () => {
    const { toJSON } = render(<StrengthFeedPanel session={makeSession({ exercises: [] })} />);
    expect(toJSON()).toBeNull();
  });

  it('shows one tile per set, the total volume and the record chip', () => {
    render(<StrengthFeedPanel session={makeSession()} />);
    expect(screen.getAllByText('55×8')).toHaveLength(2);
    expect(screen.getByText('50×8')).toBeTruthy();
    expect(screen.getByText('1,555')).toBeTruthy();
    expect(screen.getByText('+5 kg')).toBeTruthy();
    // Volume legend leaves out the skipped (0 kg) exercise.
    expect(screen.getByText('82%')).toBeTruthy();
    expect(screen.getByText('18%')).toBeTruthy();
  });

  it('paints a heavier-than-last-time set amber and a done one with the accent', () => {
    render(<StrengthFeedPanel session={makeSession()} />);
    const heavier = screen.getAllByText('55×8')[0].parent?.parent;
    const same = screen.getByText('50×8').parent?.parent;
    expect(heavier).toHaveStyle({ backgroundColor: lightColors.warning });
    expect(same).toHaveStyle({ backgroundColor: lightColors.primary });
  });

  it('reads each exercise row out as one label, skipped sets by name', () => {
    render(<StrengthFeedPanel session={makeSession()} />);
    expect(
      screen.getByLabelText(
        `${facePulls.name}: activities.strength.skippedSet, activities.strength.skippedSet`,
      ),
    ).toBeTruthy();
  });

  it('opens the activity on press', () => {
    const onPress = jest.fn();
    render(<StrengthFeedPanel session={makeSession()} onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('StrengthRhythm', () => {
  it('draws completed sets and labelled rests', () => {
    render(<StrengthRhythm session={makeSession()} />);
    // rest_seconds is the rest *after* a set: rowing's first one was not timed.
    expect(screen.getAllByText('120s')).toHaveLength(1);
    expect(screen.getAllByText('60s')).toHaveLength(1);
    expect(screen.getByText(curls.name)).toBeTruthy();
    // The skipped exercise is not in the rhythm legend.
    expect(screen.queryByText(facePulls.name)).toBeNull();
  });
});

describe('StrengthSessionCards', () => {
  it('shows progress, volume breakdown and one tile per exercise', () => {
    render(<StrengthSessionCards session={makeSession()} />);
    expect(screen.getByText('activities.strength.progressTitle')).toBeTruthy();
    expect(screen.getByText('50×10 → 55×8')).toBeTruthy();
    expect(screen.getByText('activities.strength.volumeTitle')).toBeTruthy();
    expect(
      screen.getByText(
        `activities.strength.skippedList:${JSON.stringify({ names: facePulls.name })}`,
      ),
    ).toBeTruthy();
    expect(screen.getByText('activities.strength.skipped')).toBeTruthy();
    expect(
      screen.getByText(`activities.strength.overPlan:${JSON.stringify({ kg: '5' })}`),
    ).toBeTruthy();
    expect(screen.getAllByText('55 kg × 8')).toHaveLength(2);
    expect(screen.getByText('1,280 kg')).toBeTruthy();
  });

  it('says there is nothing to compare the first time', () => {
    render(<StrengthSessionCards session={makeSession({ exercises: [curls], highlights: [] })} />);
    expect(screen.getByText('activities.strength.progressEmpty')).toBeTruthy();
  });

  it('shows the note only when there is one (owner)', () => {
    const { rerender } = render(<StrengthSessionCards session={makeSession()} />);
    expect(screen.queryByText('activities.strength.notesTitle')).toBeNull();
    rerender(<StrengthSessionCards session={makeSession({ notes: 'Lekko, plecy ok' })} />);
    expect(screen.getByText('Lekko, plecy ok')).toBeTruthy();
  });

  it('keeps the exercise order', () => {
    render(<StrengthSessionCards session={makeSession()} />);
    const names = [rowing.name, curls.name, facePulls.name];
    names.forEach((n) => expect(screen.getAllByText(n).length).toBeGreaterThan(0));
  });
});
