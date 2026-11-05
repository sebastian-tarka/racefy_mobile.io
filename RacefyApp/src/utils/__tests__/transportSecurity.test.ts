import { assertSecureApiUrl, reverbUsesTls } from '../transportSecurity';

describe('assertSecureApiUrl', () => {
  it('passes the https API of a release build', () => {
    expect(assertSecureApiUrl('https://racefy.io/api', false)).toBe('https://racefy.io/api');
    expect(assertSecureApiUrl('https://app.dev.racefy.io/api', false)).toBe(
      'https://app.dev.racefy.io/api',
    );
  });

  it.each([
    'http://racefy.io/api',
    'http://192.168.1.100:8070/api',
    'racefy.io/api',
    'https:///api',
    '',
  ])('stops a release build configured with %p', (url) => {
    expect(() => assertSecureApiUrl(url, false)).toThrow(/must be https/);
  });

  it('lets a development build use the local API over http', () => {
    expect(assertSecureApiUrl('http://localhost:8070/api', true)).toBe('http://localhost:8070/api');
  });
});

describe('reverbUsesTls', () => {
  it('is always on in a release build, whatever scheme the server sends', () => {
    expect(reverbUsesTls('https', false)).toBe(true);
    expect(reverbUsesTls('http', false)).toBe(true);
    expect(reverbUsesTls(undefined, false)).toBe(true);
  });

  it('follows the server in development, for a local Reverb over ws', () => {
    expect(reverbUsesTls('http', true)).toBe(false);
    expect(reverbUsesTls('https', true)).toBe(true);
  });
});
