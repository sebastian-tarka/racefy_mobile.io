import i18n from 'i18next';
import { formatDate, formatIntlDate, formatTimeAgo, getAppLocale } from '../dateFormat';

const DATE = new Date(2026, 10, 1, 9, 5); // 1 Nov 2026, 09:05 local time

describe('dateFormat', () => {
  beforeAll(() => i18n.init({ lng: 'en', resources: {} }));
  afterEach(() => i18n.changeLanguage('en'));

  it('follows the app language, not the device', async () => {
    expect(formatDate(DATE, 'PP')).toBe('Nov 1, 2026');
    await i18n.changeLanguage('pl');
    expect(formatDate(DATE, 'PP')).toBe('1 lis 2026');
    await i18n.changeLanguage('es');
    expect(formatDate(DATE, 'PP')).toBe('1 nov 2026');
  });

  it('uses the 12 h clock only in English', async () => {
    expect(formatDate(DATE, 'p')).toBe('9:05 AM');
    await i18n.changeLanguage('pl');
    expect(formatDate(DATE, 'p')).toBe('09:05');
  });

  it('translates relative times', async () => {
    await i18n.changeLanguage('pl');
    expect(formatTimeAgo(Date.now() - 5 * 60_000)).toBe('5 minut temu');
  });

  it('passes the app language to Intl and strips the region', async () => {
    await i18n.changeLanguage('pl-PL');
    expect(getAppLocale()).toBe('pl');
    expect(formatIntlDate(DATE, { day: 'numeric', month: 'long' })).toBe('1 listopada');
  });
});
