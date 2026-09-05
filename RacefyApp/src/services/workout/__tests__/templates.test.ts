import {
  buildGoalReachedText,
  buildHalfwayText,
  buildSegmentStartText,
  spokenDistance,
  spokenDuration,
} from '../templates';

describe('spokenDistance', () => {
  it('speaks metres below 1 km, rounded to 10', () => {
    expect(spokenDistance(384, 'en')).toBe('380 metres');
    expect(spokenDistance(384, 'pl')).toBe('380 metrów');
  });

  it('speaks kilometres with one decimal below 10 km and locale decimal separator', () => {
    expect(spokenDistance(2500, 'en')).toBe('2.5 kilometres');
    expect(spokenDistance(2500, 'pl')).toBe('2,5 kilometra');
    expect(spokenDistance(5000, 'pl')).toBe('5 kilometrów');
    expect(spokenDistance(1000, 'en')).toBe('1 kilometre');
    expect(spokenDistance(21097, 'en')).toBe('21 kilometres');
  });

  it('applies Polish plural rules', () => {
    expect(spokenDistance(2000, 'pl')).toBe('2 kilometry');
    expect(spokenDistance(12000, 'pl')).toBe('12 kilometrów');
    expect(spokenDistance(22000, 'pl')).toBe('22 kilometry');
  });

  it('speaks miles for imperial users', () => {
    expect(spokenDistance(5000, 'en', 'imperial')).toBe('3.1 miles');
    expect(spokenDistance(1609, 'en', 'imperial')).toBe('1 mile');
  });
});

describe('spokenDuration', () => {
  it('speaks seconds under 90 s, otherwise whole minutes and hours', () => {
    expect(spokenDuration(45, 'en')).toBe('45 seconds');
    expect(spokenDuration(1, 'pl')).toBe('1 sekunda');
    expect(spokenDuration(1800, 'en')).toBe('30 minutes');
    expect(spokenDuration(3900, 'en')).toBe('1 hour 5 minutes');
    expect(spokenDuration(3600, 'pl')).toBe('1 godzina');
    expect(spokenDuration(150, 'pl')).toBe('3 minuty'); // 2.5 min rounds to 3
  });
});

describe('sentences', () => {
  it('halfway mentions what is left', () => {
    expect(buildHalfwayText({ type: 'distance', meters: 2500 }, 'en', 'metric')).toBe(
      'Halfway there. 2.5 kilometres to go.',
    );
    expect(buildHalfwayText({ type: 'time', seconds: 900 }, 'pl', 'metric')).toBe(
      'Połowa za Tobą. Zostało 15 minut.',
    );
  });

  it('goal reached reports the complementary measure and says the recording continues', () => {
    expect(
      buildGoalReachedText(
        { type: 'distance', meters: 5000 },
        { activeSeconds: 1500, distanceM: 5000 },
        'en',
        'metric',
      ),
    ).toBe('Goal reached: 5 kilometres in 25 minutes. Great work — the recording continues.');
    expect(
      buildGoalReachedText(
        { type: 'time', seconds: 1800 },
        { activeSeconds: 1800, distanceM: 5430 },
        'pl',
        'metric',
      ),
    ).toBe(
      'Cel osiągnięty: 30 minut, pokonane 5,4 kilometra. Świetna robota, nagrywanie trwa dalej.',
    );
  });

  it('segment start names the repeat and the length', () => {
    expect(
      buildSegmentStartText(
        {
          index: 3,
          kind: 'work',
          end: { type: 'distance', meters: 400 },
          repeatLabel: { current: 2, total: 6 },
        },
        'en',
        'metric',
      ),
    ).toBe('Work 2 of 6: 400 metres.');
    expect(
      buildSegmentStartText({ index: 9, kind: 'cooldown', end: { type: 'open' } }, 'pl', 'metric'),
    ).toBe('Schłodzenie.');
  });
});
