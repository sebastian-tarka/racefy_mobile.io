import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { ForceUpdateScreen } from '../ForceUpdateScreen';
import { openUpdateUrl } from '../../../utils/externalLinks';

const mockUpdate = { value: null as Record<string, unknown> | null };
const mockRefresh = jest.fn(async () => {});

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }), isDark: false }),
}));
jest.mock('../../../hooks/useAppVersion', () => ({
  useAppVersion: () => ({ update: mockUpdate.value, currentAppVersion: '1.20.0' }),
}));
jest.mock('../../../contexts/AppConfigContext', () => ({
  useAppConfig: () => ({ refresh: mockRefresh }),
}));
jest.mock('../../../components', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    BrandLogo: () => null,
    Button: ({ title, onPress }: { title: string; onPress: () => void }) => (
      <Text onPress={onPress}>{title}</Text>
    ),
  };
});
jest.mock('../../../utils/externalLinks', () => ({ openUpdateUrl: jest.fn() }));

const APK = 'https://expo.dev/artifacts/eas/abc.apk';
const config = (update_url: string) => ({
  current_version: '1.35.0',
  minimum_version: '1.35.0',
  update_url,
  force_update: true,
});

beforeEach(() => {
  jest.clearAllMocks();
  (openUpdateUrl as jest.Mock).mockResolvedValue(true);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

it("opens the server's link — a store is never assumed", async () => {
  mockUpdate.value = config(APK);
  render(<ForceUpdateScreen />);

  await act(async () => fireEvent.press(screen.getByText('update.updateNow')));

  expect(openUpdateUrl).toHaveBeenCalledWith(APK);
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('shows the link and lets it be copied, so a phone that cannot open it is not stuck', async () => {
  mockUpdate.value = config(APK);
  (openUpdateUrl as jest.Mock).mockResolvedValue(false);
  render(<ForceUpdateScreen />);

  expect(screen.getByText(APK)).toBeTruthy();

  await act(async () => fireEvent.press(screen.getByText('update.updateNow')));
  expect(Alert.alert).toHaveBeenCalledWith('common.error', 'update.openFailed');

  await act(async () => fireEvent.press(screen.getByText('update.copyLink')));
  expect(Clipboard.setStringAsync).toHaveBeenCalledWith(APK);
  expect(screen.getByText('update.linkCopied')).toBeTruthy();
});

it('without a link: says so and asks the server again instead of failing', async () => {
  mockUpdate.value = config('  ');
  render(<ForceUpdateScreen />);

  expect(screen.queryByText('update.updateNow')).toBeNull();
  expect(screen.getByText('update.noLink')).toBeTruthy();

  await act(async () => fireEvent.press(screen.getByText('update.checkAgain')));

  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(openUpdateUrl).not.toHaveBeenCalled();
});
