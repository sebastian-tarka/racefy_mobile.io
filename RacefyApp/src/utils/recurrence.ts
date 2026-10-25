/**
 * The "Repeat" section of the event form → `recurrence` of POST /events.
 *
 * The API generates every edition from the rule, starting at `starts_at`, and
 * answers 422 on `starts_at` when that date is not one the rule produces. So the
 * monthly variants are derived from the start date (they always match), and the
 * weekly one is checked here before submitting.
 */
import { format } from 'date-fns/format';
import type { RecurrenceInput } from '../types/api';

export type RecurrenceFrequency = 'weekly' | 'monthly';
/** Monthly "on the 15th" vs "on the last Saturday" — both taken from the start date. */
export type MonthlyMode = 'day_of_month' | 'weekday';
export type RecurrenceEnd = 'never' | 'count' | 'until';
export type WeekOfMonth = 1 | 2 | 3 | 4 | -1;

export interface RecurrenceForm {
  enabled: boolean;
  frequency: RecurrenceFrequency;
  /** Every N weeks / months, 1-12. */
  interval: number;
  /** 0 = Sunday … 6 = Saturday, like Date#getDay and the API. */
  byWeekday: number[];
  monthlyMode: MonthlyMode;
  end: RecurrenceEnd;
  /** Total editions including the first. */
  count: string;
  until: Date | null;
  /** Empty = registration opens as soon as the edition exists. */
  registrationOpensDaysBefore: string;
}

const MIN_COUNT = 2;
const MAX_COUNT = 520;
export const MAX_INTERVAL = 12;

export const initialRecurrenceForm: RecurrenceForm = {
  enabled: false,
  frequency: 'weekly',
  interval: 1,
  byWeekday: [],
  monthlyMode: 'day_of_month',
  end: 'never',
  count: '10',
  until: null,
  registrationOpensDaysBefore: '',
};

/** Which "nth weekday" of its month a date is; a 5th one counts as the last (the API has no 5). */
export function weekOfMonth(date: Date): WeekOfMonth {
  const nth = Math.ceil(date.getDate() / 7);
  return nth >= 5 ? -1 : (nth as WeekOfMonth);
}

/** i18n key of the first problem, or null when the form can be sent. */
export function validateRecurrence(form: RecurrenceForm, startsAt: Date): string | null {
  if (!form.enabled) return null;
  if (form.frequency === 'weekly') {
    if (form.byWeekday.length === 0) return 'eventForm.recurrence.errors.noWeekday';
    if (!form.byWeekday.includes(startsAt.getDay())) {
      return 'eventForm.recurrence.errors.startNotOnRule';
    }
  }
  if (form.end === 'count') {
    const count = parseInt(form.count, 10);
    if (!(count >= MIN_COUNT && count <= MAX_COUNT)) return 'eventForm.recurrence.errors.count';
  }
  if (form.end === 'until') {
    if (!form.until || format(form.until, 'yyyy-MM-dd') <= format(startsAt, 'yyyy-MM-dd')) {
      return 'eventForm.recurrence.errors.until';
    }
  }
  if (form.registrationOpensDaysBefore) {
    const days = parseInt(form.registrationOpensDaysBefore, 10);
    if (!(days >= 1 && days <= 365)) return 'eventForm.recurrence.errors.registration';
  }
  return null;
}

/** The API rule for a valid form; `undefined` when the event doesn't repeat. */
export function buildRecurrenceInput(
  form: RecurrenceForm,
  startsAt: Date,
  timezone: string,
): RecurrenceInput | undefined {
  if (!form.enabled) return undefined;
  const rule: RecurrenceInput = {
    frequency: form.frequency,
    interval: form.interval,
    timezone,
  };
  if (form.frequency === 'weekly') {
    rule.by_weekday = [...new Set(form.byWeekday)].sort((a, b) => a - b);
  } else if (form.monthlyMode === 'day_of_month') {
    rule.day_of_month = startsAt.getDate();
  } else {
    rule.week_of_month = weekOfMonth(startsAt);
    rule.by_weekday = [startsAt.getDay()];
  }
  if (form.end === 'count') rule.count = parseInt(form.count, 10);
  if (form.end === 'until' && form.until) rule.until = format(form.until, 'yyyy-MM-dd');
  if (form.registrationOpensDaysBefore) {
    rule.registration_opens_days_before = parseInt(form.registrationOpensDaysBefore, 10);
  }
  return rule;
}
