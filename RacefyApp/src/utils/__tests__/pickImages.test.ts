import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { pickImages } from '../pickImages';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));
jest.mock('../../i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const asset = { uri: 'file:///a.jpg', width: 100, height: 80, extra: 'dropped' };

describe('pickImages', () => {
  let alert: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    picker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
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

  it('returns uri and size of the picked images', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] } as any);
    await expect(pickImages({ multiple: true, selectionLimit: 3 })).resolves.toEqual([
      { uri: 'file:///a.jpg', width: 100, height: 80 },
    ]);
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 3, quality: 0.8 }),
    );
  });

  it('opens the camera without multi-select options', async () => {
    picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [asset] } as any);
    await pickImages({ source: 'camera', allowsEditing: true, aspect: [1, 1] });
    const opts = picker.launchCameraAsync.mock.calls[0][0] as Record<string, unknown>;
    expect(opts).toMatchObject({ allowsEditing: true, aspect: [1, 1] });
    expect(opts).not.toHaveProperty('allowsMultipleSelection');
  });
});
