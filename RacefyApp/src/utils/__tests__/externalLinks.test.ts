import { Linking } from 'react-native';
import { openExternalUrl, openUpdateUrl, safeExternalUrl } from '../externalLinks';

jest.mock('react-native', () => ({ Linking: { openURL: jest.fn() } }));
jest.mock('../../services/logger', () => ({ logger: { warn: jest.fn() } }));

const openURL = Linking.openURL as jest.Mock;

beforeEach(() => {
  openURL.mockReset();
  openURL.mockResolvedValue(true);
});

describe('safeExternalUrl', () => {
  const release = (url: unknown, extra: `${string}:`[] = []) =>
    safeExternalUrl(url as string, extra, false);

  it('passes web links', () => {
    expect(release('https://racefy.io/download/android')).toBe(
      'https://racefy.io/download/android',
    );
    expect(release('  https://youtu.be/abc?t=10  ')).toBe('https://youtu.be/abc?t=10');
    expect(release('HTTPS://Example.com/A')).toBe('HTTPS://Example.com/A');
  });

  it('upgrades cleartext links in release builds and keeps them in development', () => {
    expect(release('http://youtube.com/watch?v=1')).toBe('https://youtube.com/watch?v=1');
    expect(safeExternalUrl('http://localhost:8070/storage/a.pdf', [], true)).toBe(
      'http://localhost:8070/storage/a.pdf',
    );
  });

  it.each([
    'tel:+48123456789',
    'sms:123?body=hi',
    'intent://scan/#Intent;scheme=zxing;end',
    'racefy://messages/1',
    'javascript:alert(1)',
    'file:///data/data/com.racefy.app/databases/racefy_tracking.db',
    'market://details?id=com.other.app',
    'mailto:someone@example.com',
  ])('refuses %s', (url) => {
    expect(release(url)).toBeNull();
  });

  it.each([
    ['nothing', ''],
    ['no scheme', 'racefy.io/download'],
    ['a relative path', '/storage/file.pdf'],
    ['no host', 'https:///etc/passwd'],
    ['no authority', 'https:evil.example'],
    ['whitespace inside', 'https://racefy.io/ a'],
    ['a line break inside', 'https://racefy.io/\nintent://x'],
    ['not a string', 42],
    ['null', null],
    ['undefined', undefined],
  ])('refuses %s', (_label, url) => {
    expect(release(url)).toBeNull();
  });

  it('passes a scheme only where the caller asked for it', () => {
    expect(release('mailto:support@racefy.io', ['mailto:'])).toBe('mailto:support@racefy.io');
    expect(release('MAILTO:support@racefy.io', ['mailto:'])).toBe('MAILTO:support@racefy.io');
    expect(release('tel:123', ['mailto:'])).toBeNull();
  });
});

describe('openExternalUrl', () => {
  it('opens a web link and reports it', async () => {
    await expect(openExternalUrl('https://sponsor.example/offer')).resolves.toBe(true);
    expect(openURL).toHaveBeenCalledWith('https://sponsor.example/offer');
  });

  it('never hands a refused link to the OS', async () => {
    await expect(openExternalUrl('intent://x#Intent;end')).resolves.toBe(false);
    await expect(openExternalUrl(null)).resolves.toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('reports a failure of the OS instead of throwing', async () => {
    openURL.mockRejectedValue(new Error('No Activity found to handle Intent'));

    await expect(openExternalUrl('https://racefy.io')).resolves.toBe(false);
  });
});

describe('openUpdateUrl — whatever the admin set as the update target', () => {
  it.each([
    'https://play.google.com/store/apps/details?id=com.racefy.app',
    'https://apps.apple.com/app/id123456789',
    'https://testflight.apple.com/join/92ECXK3d',
    'https://expo.dev/artifacts/eas/abc.apk',
    'https://expo.dev/accounts/acme/projects/App/builds/0a679516',
    'market://details?id=com.racefy.app',
    'itms-apps://apps.apple.com/app/id123456789',
    'itms-beta://testflight.apple.com/join/92ECXK3d',
    'itms-services://?action=download-manifest&url=https://racefy.io/ios/manifest.plist',
  ])('opens %s', async (url) => {
    await expect(openUpdateUrl(url)).resolves.toBe(true);
    expect(openURL).toHaveBeenCalledWith(url);
  });

  it('still refuses what is not a way to install an app', async () => {
    await expect(openUpdateUrl('tel:123')).resolves.toBe(false);
    await expect(openUpdateUrl('')).resolves.toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });
});
