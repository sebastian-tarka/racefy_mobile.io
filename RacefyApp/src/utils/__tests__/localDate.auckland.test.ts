/** @time-zone Pacific/Auckland */
import i18n from 'i18next';
import { formatDate, formatIntlDate, localDateString, parseLocalDate } from '../dateFormat';
import { getDateRangeForTimeRange } from '../dateRanges';

jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('a phone in Auckland (UTC+13 in November)', () => {
  beforeAll(() => i18n.init({ lng: 'en', resources: {} }));

  it('really runs in Auckland', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Pacific/Auckland');
    expect(new Date(2026, 10, 1, 0, 30).toISOString()).toBe('2026-10-31T11:30:00.000Z');
  });

  it('just after local midnight the day is already 1 Nov, though UTC still says 31 Oct', () => {
    const justAfterMidnight = new Date(2026, 10, 1, 0, 30);
    expect(justAfterMidnight.toISOString().slice(0, 10)).toBe('2026-10-31'); // the old bug
    expect(localDateString(justAfterMidnight)).toBe('2026-11-01');
  });

  it('a bare day from the API is shown as that day', () => {
    expect(parseLocalDate('2026-11-01').getDate()).toBe(1);
    expect(formatDate('2026-11-01', 'PP')).toBe('Nov 1, 2026');
    expect(formatIntlDate('2026-11-01', { day: 'numeric', month: 'short' })).toBe('Nov 1');
  });

  it('the stats range ends on the local today', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 1, 0, 30));
    try {
      expect(getDateRangeForTimeRange('week')).toEqual({ from: '2026-10-25', to: '2026-11-01' });
    } finally {
      jest.useRealTimers();
    }
  });
});
