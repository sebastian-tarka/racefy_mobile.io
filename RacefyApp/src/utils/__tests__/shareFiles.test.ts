import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { exportGpxAndShare } from '../gpxExport';
import { discardShareFileLater, purgeStaleShareFiles } from '../shareFiles';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8' },
  deleteAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('../../services/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), activity: jest.fn() },
}));

const fs = FileSystem as jest.Mocked<typeof FileSystem>;
const sharing = Sharing as jest.Mocked<typeof Sharing>;

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  fs.deleteAsync.mockResolvedValue(undefined);
  fs.writeAsStringAsync.mockResolvedValue(undefined);
  sharing.isAvailableAsync.mockResolvedValue(true);
  sharing.shareAsync.mockResolvedValue(undefined);
});

afterEach(() => jest.useRealTimers());

describe('discardShareFileLater', () => {
  it('leaves the file for the receiving app, then deletes it', () => {
    discardShareFileLater('file:///cache/racefy-activity-7.gpx');

    jest.advanceTimersByTime(59_000);
    expect(fs.deleteAsync).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1_000);
    expect(fs.deleteAsync).toHaveBeenCalledWith('file:///cache/racefy-activity-7.gpx', {
      idempotent: true,
    });
  });

  it('deletes right away when there is nothing to wait for', () => {
    discardShareFileLater('file:///cache/share-image-1.webp', 0);

    expect(fs.deleteAsync).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the delete fails', async () => {
    fs.deleteAsync.mockRejectedValue(new Error('gone'));

    expect(() => discardShareFileLater('file:///cache/x', 0)).not.toThrow();
    await Promise.resolve();
  });
});

describe('purgeStaleShareFiles', () => {
  const files = (entries: Record<string, number | null>) => {
    fs.readDirectoryAsync.mockResolvedValue(Object.keys(entries));
    fs.getInfoAsync.mockImplementation(async (uri: string) => {
      const age = entries[uri.replace('file:///cache/', '')];
      return {
        exists: true,
        isDirectory: false,
        uri,
        size: 1,
        modificationTime: age === null ? undefined : (NOW - age) / 1000,
      } as any;
    });
  };

  it('removes old share files and nothing else', async () => {
    files({
      'racefy-activity-7.gpx': 60 * MINUTE,
      'share-image-1700000000000.webp': 11 * MINUTE,
      'racefy-overlay-1700000000000.jpg': 3 * 24 * 60 * MINUTE,
      ImageManipulator: 60 * MINUTE,
      'mapbox-tiles.db': 60 * MINUTE,
      'my-racefy-activity-export.gpx': 60 * MINUTE,
    });

    await expect(purgeStaleShareFiles(NOW)).resolves.toBe(3);
    expect(fs.deleteAsync.mock.calls.map(([uri]) => uri)).toEqual([
      'file:///cache/racefy-activity-7.gpx',
      'file:///cache/share-image-1700000000000.webp',
      'file:///cache/racefy-overlay-1700000000000.jpg',
    ]);
  });

  it('leaves a file that may still be in the share sheet', async () => {
    files({ 'racefy-activity-7.gpx': 2 * MINUTE });

    await expect(purgeStaleShareFiles(NOW)).resolves.toBe(0);
    expect(fs.deleteAsync).not.toHaveBeenCalled();
  });

  it('treats a file without a modification time as old', async () => {
    files({ 'share-image-1.webp': null });

    await expect(purgeStaleShareFiles(NOW)).resolves.toBe(1);
  });

  it('gives up quietly when the cache cannot be listed', async () => {
    fs.readDirectoryAsync.mockRejectedValue(new Error('no such directory'));

    await expect(purgeStaleShareFiles(NOW)).resolves.toBe(0);
  });
});

describe('exportGpxAndShare', () => {
  const input = {
    activityId: 7,
    points: [{ lat: 52.2, lng: 21.0, timestamp: '2026-11-05T08:00:00Z' }] as any,
  };
  const uri = 'file:///cache/racefy-activity-7.gpx';

  const expectDiscarded = () => {
    expect(fs.deleteAsync).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(fs.deleteAsync).toHaveBeenCalledWith(uri, { idempotent: true });
  };

  it('removes the track after a successful share', async () => {
    await expect(exportGpxAndShare(input)).resolves.toBe(true);

    expect(sharing.shareAsync).toHaveBeenCalledWith(uri, expect.any(Object));
    expectDiscarded();
  });

  it('removes the track when the share fails or is cancelled', async () => {
    sharing.shareAsync.mockRejectedValue(new Error('User did not share'));

    await expect(exportGpxAndShare(input)).resolves.toBe(false);
    expectDiscarded();
  });

  it('removes the track when sharing is not available on the device', async () => {
    sharing.isAvailableAsync.mockResolvedValue(false);

    await expect(exportGpxAndShare(input)).resolves.toBe(false);
    expect(sharing.shareAsync).not.toHaveBeenCalled();
    expectDiscarded();
  });

  it('writes nothing for an activity without points', async () => {
    await expect(exportGpxAndShare({ activityId: 7, points: [] })).resolves.toBe(false);

    expect(fs.writeAsStringAsync).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(fs.deleteAsync).not.toHaveBeenCalled();
  });
});
