/** @time-zone America/Los_Angeles */
import i18n from 'i18next';
import { formatDate, formatIntlDate, localDateString, parseLocalDate, toDate } from '../dateFormat';
import { getDateRangeForTimeRange, getPreviousDateRange } from '../dateRanges';

jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('a phone in Los Angeles (UTC-7 in October)', () => {
  beforeAll(() => i18n.init({ lng: 'en', resources: {} }));

  it('really runs in Los Angeles', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Los_Angeles');
    expect(new Date(2026, 9, 31, 20, 0).toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });

  it('in the evening the day is still 31 Oct, though UTC already says 1 Nov', () => {
    const evening = new Date(2026, 9, 31, 20, 0);
    expect(evening.toISOString().slice(0, 10)).toBe('2026-11-01'); // the old bug
    expect(localDateString(evening)).toBe('2026-10-31');
  });

  it("new Date('YYYY-MM-DD') is the previous evening here; parseLocalDate is not", () => {
    expect(new Date('2026-11-01').getDate()).toBe(31); // the old bug
    expect(parseLocalDate('2026-11-01').getDate()).toBe(1);
    expect(toDate('2026-11-01').getDate()).toBe(1);
    expect(formatDate('2026-11-01', 'PP')).toBe('Nov 1, 2026');
    expect(formatIntlDate('2026-11-01', { weekday: 'short', day: 'numeric' })).toMatch(/Sun/);
  });

  it('stats ranges are local days and the previous window is read back as local days', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 31, 20, 0));
    try {
      expect(getDateRangeForTimeRange('week')).toEqual({ from: '2026-10-24', to: '2026-10-31' });
      expect(getPreviousDateRange({ from: '2026-10-25', to: '2026-10-31' })).toEqual({
        from: '2026-10-18',
        to: '2026-10-24',
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
