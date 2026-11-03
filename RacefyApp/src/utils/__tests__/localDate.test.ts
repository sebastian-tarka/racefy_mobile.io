import i18n from 'i18next';
import { formatDate, localDateString, parseLocalDate, toDate } from '../dateFormat';
import { getDateRangeForTimeRange, getPreviousDateRange } from '../dateRanges';

jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Zone-independent checks; localDate.auckland / localDate.losangeles run the same helpers as phones east and west of Greenwich.
describe('local calendar days (time zone plan F4)', () => {
  beforeAll(() => i18n.init({ lng: 'en', resources: {} }));

  it('parseLocalDate is local midnight of that day and round-trips through localDateString', () => {
    const day = parseLocalDate('2026-11-01');
    expect([day.getFullYear(), day.getMonth(), day.getDate(), day.getHours()]).toEqual([
      2026, 10, 1, 0,
    ]);
    expect(localDateString(day)).toBe('2026-11-01');
    expect(localDateString(new Date(2026, 0, 9, 23, 59))).toBe('2026-01-09');
  });

  it('toDate keeps instants and Dates as they are and reads bare days locally', () => {
    expect(toDate('2026-11-01').getDate()).toBe(1);
    expect(toDate('2026-11-01T07:00:00.000Z').toISOString()).toBe('2026-11-01T07:00:00.000Z');
    const d = new Date();
    expect(toDate(d)).toBe(d);
    expect(toDate(0).getTime()).toBe(0);
    expect(formatDate('2026-11-01', 'PP')).toBe('Nov 1, 2026');
  });

  it('stats ranges end on the local today and the previous window is the same length, ending the day before', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 1, 0, 30));
    try {
      expect(getDateRangeForTimeRange('week')).toEqual({ from: '2026-10-25', to: '2026-11-01' });
      expect(getDateRangeForTimeRange('month')).toEqual({ from: '2026-10-01', to: '2026-11-01' });
      expect(getDateRangeForTimeRange('all_time')).toBeNull();
      expect(getPreviousDateRange({ from: '2026-10-25', to: '2026-11-01' })).toEqual({
        from: '2026-10-17',
        to: '2026-10-24',
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
