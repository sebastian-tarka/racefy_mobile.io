import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { pickImages } from '../pickImages';
import { stripImagesMetadata } from '../imageMetadata';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));
jest.mock('../../i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));
// The re-encode itself is covered in imageMetadata.test.ts; here it marks what it returns.
jest.mock('../imageMetadata', () => ({ stripImagesMetadata: jest.fn() }));

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const strip = stripImagesMetadata as jest.Mock;
const asset = { uri: 'file:///a.jpg', width: 100, height: 80, extra: 'dropped' };
const clean = (uri: string) => uri.replace('file:///', 'file:///clean/');

describe('pickImages', () => {
  let alert: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    picker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    strip.mockImplementation(async (images: { uri: string }[]) => ({
      images: images.map((image) => ({ ...image, uri: clean(image.uri) })),
      failed: 0,
    }));
  });

  it('tells the user when gallery permission is denied, and returns nothing', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);
    await expect(pickImages()).resolves.toEqual([]);
    expect(alert).toHaveBeenCalledWith('common.error', 'permissions.gallery');
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('uses a custom denied message for the camera', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);
    await pickImages({ source: 'camera', deniedMessage: 'no camera' });
    expect(alert).toHaveBeenCalledWith('common.error', 'no camera');
  });

  it('returns nothing when the picker is cancelled', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null } as any);
    await expect(pickImages()).resolves.toEqual([]);
  });

  it('returns the re-encoded copies of the picked images, never the picked files', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] } as any);
    await expect(pickImages({ multiple: true, selectionLimit: 3 })).resolves.toEqual([
      { uri: 'file:///clean/a.jpg', width: 100, height: 80 },
    ]);
    expect(strip).toHaveBeenCalledWith([{ uri: 'file:///a.jpg', width: 100, height: 80 }], {
      maxSide: undefined,
      quality: undefined,
    });
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 3, quality: 0.8 }),
    );
  });

  it('passes the downscale and quality on to the re-encode', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] } as any);
    await pickImages({ maxSide: 2048, quality: 0.85 });
    expect(strip).toHaveBeenCalledWith(expect.any(Array), { maxSide: 2048, quality: 0.85 });
  });

  it('leaves out an image that could not be re-encoded and tells the user', async () => {
    const second = { uri: 'file:///b.jpg', width: 10, height: 10 };
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [asset, second],
    } as any);
    strip.mockResolvedValue({
      images: [{ uri: 'file:///clean/b.jpg', width: 10, height: 10 }],
      failed: 1,
    });

    await expect(pickImages({ multiple: true })).resolves.toEqual([
      { uri: 'file:///clean/b.jpg', width: 10, height: 10 },
    ]);
    expect(alert).toHaveBeenCalledWith('common.error', 'common.imagePrepareFailed');
  });

  it('opens the camera without multi-select options', async () => {
    picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [asset] } as any);
    await pickImages({ source: 'camera', allowsEditing: true, aspect: [1, 1] });
    const opts = picker.launchCameraAsync.mock.calls[0][0] as Record<string, unknown>;
    expect(opts).toMatchObject({ allowsEditing: true, aspect: [1, 1] });
    expect(opts).not.toHaveProperty('allowsMultipleSelection');
  });
});
