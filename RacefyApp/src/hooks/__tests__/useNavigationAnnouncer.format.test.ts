import i18n from 'i18next';
import en from '../../i18n/locales/en.json';
import pl from '../../i18n/locales/pl.json';

import { formatSpokenDistance } from '../useNavigationAnnouncer';

jest.mock('expo-speech', () => ({ stop: jest.fn(() => Promise.resolve()), speak: jest.fn() }));
jest.mock('../../services/audioCoach/audioSession', () => ({ speakDucked: jest.fn() }));
jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

beforeAll(async () => {
  await i18n.init({
    resources: { en: { translation: en }, pl: { translation: pl } },
    lng: 'pl',
    fallbackLng: 'en',
    compatibilityJSON: 'v4',
    interpolation: { escapeValue: false },
  });
});

describe('formatSpokenDistance (pl)', () => {
  beforeAll(() => i18n.changeLanguage('pl'));

  it('uses Polish plural forms for metres (rounded to 10)', () => {
    expect(formatSpokenDistance(196)).toBe('200 metrów');
    expect(formatSpokenDistance(43)).toBe('40 metrów');
    expect(formatSpokenDistance(3)).toBe('10 metrów'); // never announces "0 metrów"
  });

  it('uses Polish plural forms and comma decimals for kilometres', () => {
    expect(formatSpokenDistance(1000)).toBe('1 kilometr');
    expect(formatSpokenDistance(1500)).toBe('1,5 kilometra');
    expect(formatSpokenDistance(2000)).toBe('2 kilometry');
    expect(formatSpokenDistance(5049)).toBe('5 kilometrów');
    expect(formatSpokenDistance(12400)).toBe('12 kilometrów');
  });

  it('has spoken navigation keys (no English fallback)', () => {
    expect(i18n.t('navigation.in')).toBe('Za');
    expect(i18n.t('navigation.backOnRoute')).toBe('Powrót na trasę');
  });
});

describe('formatSpokenDistance (en)', () => {
  beforeAll(() => i18n.changeLanguage('en'));

  it('formats English singular/plural', () => {
    expect(formatSpokenDistance(1000)).toBe('1 kilometer');
    expect(formatSpokenDistance(2500)).toBe('2.5 kilometers');
    expect(formatSpokenDistance(150)).toBe('150 meters');
  });
});
