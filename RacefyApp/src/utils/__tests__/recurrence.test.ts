import {
  buildRecurrenceInput,
  initialRecurrenceForm,
  RecurrenceForm,
  validateRecurrence,
  weekOfMonth,
} from '../recurrence';

// Saturday 29 Aug 2026, 10:00 local — the last Saturday of August
const SATURDAY = new Date(2026, 7, 29, 10, 0);
const TZ = 'Europe/Warsaw';

const weekly: RecurrenceForm = { ...initialRecurrenceForm, enabled: true, byWeekday: [6] };

describe('weekOfMonth', () => {
  it('counts the nth weekday of the month', () => {
    expect(weekOfMonth(new Date(2026, 7, 1))).toBe(1);
    expect(weekOfMonth(new Date(2026, 7, 8))).toBe(2);
    expect(weekOfMonth(new Date(2026, 7, 28))).toBe(4);
  });

  it('turns a 5th weekday into "last" — the API has no 5', () => {
    expect(weekOfMonth(SATURDAY)).toBe(-1);
  });
});

describe('validateRecurrence', () => {
  it('lets a one-off event through', () => {
    expect(validateRecurrence(initialRecurrenceForm, SATURDAY)).toBeNull();
  });

  it('needs at least one weekday', () => {
    expect(validateRecurrence({ ...weekly, byWeekday: [] }, SATURDAY)).toBe(
      'eventForm.recurrence.errors.noWeekday',
    );
  });

  it('rejects a start that the weekly rule would never produce (API 422 on starts_at)', () => {
    expect(validateRecurrence({ ...weekly, byWeekday: [0, 3] }, SATURDAY)).toBe(
      'eventForm.recurrence.errors.startNotOnRule',
    );
    expect(validateRecurrence({ ...weekly, byWeekday: [3, 6] }, SATURDAY)).toBeNull();
  });

  it('accepts any start for monthly rules — they are derived from it', () => {
    expect(
      validateRecurrence({ ...weekly, frequency: 'monthly', byWeekday: [] }, SATURDAY),
    ).toBeNull();
  });

  it('keeps the edition count within 2-520', () => {
    const withCount = (count: string) => ({ ...weekly, end: 'count' as const, count });
    expect(validateRecurrence(withCount('1'), SATURDAY)).toBe('eventForm.recurrence.errors.count');
    expect(validateRecurrence(withCount('521'), SATURDAY)).toBe(
      'eventForm.recurrence.errors.count',
    );
    expect(validateRecurrence(withCount(''), SATURDAY)).toBe('eventForm.recurrence.errors.count');
    expect(validateRecurrence(withCount('2'), SATURDAY)).toBeNull();
  });

  it('wants the end date after the start day', () => {
    const until = (date: Date | null) => ({ ...weekly, end: 'until' as const, until: date });
    expect(validateRecurrence(until(null), SATURDAY)).toBe('eventForm.recurrence.errors.until');
    expect(validateRecurrence(until(new Date(2026, 7, 29, 23, 0)), SATURDAY)).toBe(
      'eventForm.recurrence.errors.until',
    );
    expect(validateRecurrence(until(new Date(2026, 8, 30)), SATURDAY)).toBeNull();
  });

  it('limits "registration opens N days before" to 1-365', () => {
    expect(validateRecurrence({ ...weekly, registrationOpensDaysBefore: '0' }, SATURDAY)).toBe(
      'eventForm.recurrence.errors.registration',
    );
    expect(
      validateRecurrence({ ...weekly, registrationOpensDaysBefore: '7' }, SATURDAY),
    ).toBeNull();
  });
});

describe('buildRecurrenceInput', () => {
  it('is undefined for a one-off event', () => {
    expect(buildRecurrenceInput(initialRecurrenceForm, SATURDAY, TZ)).toBeUndefined();
  });

  it('builds a weekly rule with sorted, unique weekdays', () => {
    expect(
      buildRecurrenceInput({ ...weekly, byWeekday: [6, 3, 6], interval: 2 }, SATURDAY, TZ),
    ).toStrictEqual({ frequency: 'weekly', interval: 2, timezone: TZ, by_weekday: [3, 6] });
  });

  it('takes the monthly day from the start date', () => {
    expect(buildRecurrenceInput({ ...weekly, frequency: 'monthly' }, SATURDAY, TZ)).toStrictEqual({
      frequency: 'monthly',
      interval: 1,
      timezone: TZ,
      day_of_month: 29,
    });
  });

  it('takes "last Saturday" from the start date', () => {
    expect(
      buildRecurrenceInput(
        { ...weekly, frequency: 'monthly', monthlyMode: 'weekday' },
        SATURDAY,
        TZ,
      ),
    ).toStrictEqual({
      frequency: 'monthly',
      interval: 1,
      timezone: TZ,
      week_of_month: -1,
      by_weekday: [6],
    });
  });

  it('adds the end and the registration window', () => {
    expect(
      buildRecurrenceInput(
        { ...weekly, end: 'count', count: '12', registrationOpensDaysBefore: '7' },
        SATURDAY,
        TZ,
      ),
    ).toMatchObject({ count: 12, registration_opens_days_before: 7 });
    expect(
      buildRecurrenceInput(
        { ...weekly, end: 'until', until: new Date(2026, 11, 19) },
        SATURDAY,
        TZ,
      ),
    ).toMatchObject({ until: '2026-12-19' });
  });
});
