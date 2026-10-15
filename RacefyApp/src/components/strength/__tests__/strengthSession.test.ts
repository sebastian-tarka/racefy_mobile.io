import type { TFunction } from 'i18next';
import {
  comparedExercises,
  formatKg,
  formatVolume,
  groupSeparator,
  hasStrengthSession,
  highlightDelta,
  isAutoStrengthText,
  isHeavierThanLastTime,
  overPlanKg,
  progressDelta,
  rhythmItems,
  setDetailLabel,
  setLabel,
  skippedExercises,
  strengthMetrics,
  volumeShares,
  weightUnit,
} from '../strengthSession';
import { curls, facePulls, makeSession, rowing } from './fixture';

const t = ((key: string, opts?: Record<string, unknown>) =>
  opts ? `${key}:${JSON.stringify(opts)}` : key) as unknown as TFunction;

describe('strengthSession helpers', () => {
  it('needs exercises to draw anything', () => {
    expect(hasStrengthSession(undefined)).toBe(false);
    expect(hasStrengthSession(makeSession({ exercises: [] }))).toBe(false);
    expect(hasStrengthSession(makeSession())).toBe(true);
  });

  it('labels sets the way the web does', () => {
    expect(setLabel({ weight_kg: 55, reps: 8, duration_seconds: null }, 'en')).toBe('55×8');
    expect(setLabel({ weight_kg: 17.5, reps: 10, duration_seconds: null }, 'pl')).toBe('17,5×10');
    expect(setLabel({ weight_kg: null, reps: null, duration_seconds: 45 }, 'en')).toBe('45 s');
    expect(setLabel({ weight_kg: null, reps: 20, duration_seconds: null }, 'en')).toBe('20');
    expect(setLabel(null, 'en')).toBe('—');
    expect(setDetailLabel({ weight_kg: 55, reps: 8, duration_seconds: null }, 'en')).toBe(
      '55 kg × 8',
    );
    expect(formatKg(null)).toBe('—');
  });

  it('marks only completed sets heavier than last best as heavier', () => {
    expect(isHeavierThanLastTime(rowing.sets[0], rowing)).toBe(true); // 55 > 50
    expect(isHeavierThanLastTime(rowing.sets[2], rowing)).toBe(false); // 50 = 50
    expect(isHeavierThanLastTime(rowing.sets[3], rowing)).toBe(false); // skipped
    expect(isHeavierThanLastTime(curls.sets[0], curls)).toBe(false); // no previous
  });

  it('splits the volume biggest first and leaves out 0 kg exercises', () => {
    const shares = volumeShares(makeSession());
    expect(shares.map((s) => s.exercise.name)).toEqual([rowing.name, curls.name]);
    expect(shares.map((s) => s.colorIndex)).toEqual([0, 1]);
    expect(shares[0].share).toBeCloseTo(1280 / 1555);
  });

  it('lists skipped exercises', () => {
    expect(skippedExercises(makeSession())).toEqual([facePulls]);
  });

  it('builds the rhythm from completed sets only, rests between sets of one exercise', () => {
    const { items, legend } = rhythmItems(makeSession());
    expect(items.map((i) => i.kind)).toEqual([
      'set',
      'rest',
      'set',
      'rest',
      'set', // rowing: 3 done
      'separator',
      'set',
      'rest',
      'set', // curls
    ]);
    expect(legend.map((l) => l.name)).toEqual([rowing.name, curls.name]);
  });

  it('formats highlight and progress deltas', () => {
    const session = makeSession();
    expect(highlightDelta(session.highlights[0], t, 'en')).toBe('+5 kg');
    expect(progressDelta(rowing.progress!, t, 'en')).toEqual({ text: '+5 kg', tone: 'up' });
    expect(
      progressDelta({ weight_delta_kg: 0, reps_delta: -2, duration_delta_seconds: 0 }, t, 'en')
        .tone,
    ).toBe('down');
    expect(
      progressDelta({ weight_delta_kg: 0, reps_delta: 0, duration_delta_seconds: 0 }, t),
    ).toEqual({
      text: '=',
      tone: 'same',
    });
    expect(comparedExercises(session)).toEqual([rowing]);
  });

  it('reports the weight above the plan only when there is one', () => {
    expect(overPlanKg(rowing)).toBe(5);
    expect(overPlanKg(curls)).toBeNull(); // no suggestion
    expect(overPlanKg(facePulls)).toBeNull(); // nothing done
  });

  it('builds the metric strip, volume first only when asked', () => {
    const fmt = (s: number) => `${s}s`;
    const feed = strengthMetrics(makeSession(), 2621, { formatDuration: fmt, t, locale: 'en' });
    expect(feed.map((m) => m.key)).toEqual(['duration', 'sets', 'exercises', 'rpe']);
    expect(feed[1]).toMatchObject({ value: '5', unit: '/8' });
    const detail = strengthMetrics(makeSession({ rpe: null }), 0, {
      withVolume: true,
      formatDuration: fmt,
      t,
      locale: 'en',
    });
    expect(detail.map((m) => m.key)).toEqual(['volume', 'sets', 'exercises']);
    expect(detail[0]).toMatchObject({ value: '1,555', unit: 'kg' });
  });

  it('hides a text only while the description is the generated one', () => {
    const auto = makeSession();
    const edited = makeSession({ description_is_auto: false });
    expect(isAutoStrengthText(auto, null, 'x')).toBe(true);
    expect(isAutoStrengthText(auto, '', 'x')).toBe(true);
    expect(isAutoStrengthText(auto, 'x', 'x')).toBe(true);
    expect(isAutoStrengthText(auto, 'Great day!', 'x')).toBe(false);
    expect(isAutoStrengthText(edited, 'x', 'x')).toBe(false);
    expect(isAutoStrengthText(undefined, 'x', 'x')).toBe(false);
  });

  it('always groups the volume with the locale separator', () => {
    // Intl in pl does not group 4 digits on its own; the volume still reads "5 912".
    expect(formatVolume(5912, 'pl')).toMatch(/^5\s912$/);
    expect(formatVolume(5912, 'en')).toBe('5,912');
    expect(formatVolume(1234567, 'es')).toBe('1.234.567');
    expect(formatVolume(912.6, 'en')).toBe('913');
  });

  it('falls back to a space when Intl cannot tell the separator', () => {
    const spy = jest.spyOn(Intl, 'NumberFormat').mockImplementation(() => {
      throw new Error('no Intl');
    });
    expect(groupSeparator('pl')).toBe(' ');
    spy.mockRestore();
  });

  it('converts to lb for imperial users', () => {
    expect(weightUnit('imperial')).toBe('lb');
    expect(weightUnit('metric')).toBe('kg');
    expect(formatKg(55, 'pl', 'imperial')).toBe('121,3');
    expect(formatKg(17.25, 'en', 'metric')).toBe('17.25');
    expect(setLabel({ weight_kg: 55, reps: 8, duration_seconds: null }, 'pl', 'imperial')).toBe(
      '121,3×8',
    );
    expect(
      setDetailLabel({ weight_kg: 50, reps: 8, duration_seconds: null }, 'en', 'imperial'),
    ).toBe('110.2 lb × 8');
    expect(formatVolume(5912, 'en', 'imperial')).toBe('13,034');
    expect(highlightDelta(makeSession().highlights[0], t, 'en', 'imperial')).toBe('+11 lb');
    expect(progressDelta(rowing.progress!, t, 'en', 'imperial').text).toBe('+11 lb');
    const metrics = strengthMetrics(makeSession(), 0, {
      withVolume: true,
      formatDuration: String,
      t,
      locale: 'en',
      units: 'imperial',
    });
    expect(metrics[0]).toMatchObject({ value: '3,428', unit: 'lb' });
  });
});
