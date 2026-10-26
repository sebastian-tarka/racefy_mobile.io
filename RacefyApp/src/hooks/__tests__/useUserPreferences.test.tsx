import { Alert } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { DEFAULT_PREFERENCES, useUserPreferences } from '../useUserPreferences';
import { api } from '../../services/api';
import type { UserPreferences } from '../../types/api';

jest.mock('../../services/api', () => ({
  api: { getPreferences: jest.fn(), updatePreferences: jest.fn() },
}));
jest.mock('../../services/logger', () => ({ logger: { error: jest.fn() } }));
jest.mock('../../i18n', () => ({ changeLanguage: jest.fn(async () => {}) }));
jest.mock('../useHaptics', () => ({ triggerHaptic: jest.fn() }));
const mockSetThemePreference = jest.fn();
jest.mock('../useTheme', () => ({
  useTheme: () => ({ themePreference: 'system', setThemePreference: mockSetThemePreference }),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

const getPreferences = api.getPreferences as jest.Mock;
const updatePreferences = api.updatePreferences as jest.Mock;

const server = (patch: Partial<UserPreferences> = {}): UserPreferences => ({
  ...DEFAULT_PREFERENCES,
  ...patch,
});

beforeEach(() => {
  jest.clearAllMocks();
  getPreferences.mockResolvedValue(server({ theme: 'dark', language: 'pl' }));
});

async function setup() {
  const hook = renderHook(() => useUserPreferences());
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

it('loads preferences and brings the local theme in line', async () => {
  const { result } = await setup();
  expect(result.current.preferences.theme).toBe('dark');
  expect(mockSetThemePreference).toHaveBeenCalledWith('dark');
});

it('updates optimistically and takes the server answer', async () => {
  const { result } = await setup();
  updatePreferences.mockResolvedValueOnce(server({ units: 'imperial', language: 'pl' }));
  await act(() => result.current.updatePreference('units', 'imperial'));
  expect(updatePreferences).toHaveBeenCalledWith({ units: 'imperial' });
  expect(result.current.preferences.units).toBe('imperial');
});

it('rolls back to the state before the tap when the server refuses', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const { result } = await setup();
  updatePreferences.mockRejectedValueOnce(new Error('500'));
  await act(() => result.current.updateNestedPreference('privacy', 'show_stats', false));
  expect(updatePreferences).toHaveBeenCalledWith({ 'privacy.show_stats': false });
  expect(result.current.preferences.privacy.show_stats).toBe(true);
  expect(alert).toHaveBeenCalledWith('common.error', 'settings.updateFailed');
  alert.mockRestore();
});

it('writes push and websocket of a live category together', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const { result } = await setup();
  updatePreferences.mockRejectedValueOnce(new Error('offline'));
  await act(() => result.current.updateLiveNotification('activity_started', false));
  expect(updatePreferences).toHaveBeenCalledWith({
    'notifications.activity_started.push': false,
    'notifications.activity_started.websocket': false,
  });
  expect(result.current.preferences.notifications.activity_started.push).toBe(true);
  alert.mockRestore();
});

it('updates one channel of a notification type', async () => {
  const { result } = await setup();
  const next = server();
  next.notifications = {
    ...next.notifications,
    likes: { email: false, push: true, websocket: true },
  };
  updatePreferences.mockResolvedValueOnce(next);
  await act(() => result.current.updateNotificationChannel('likes', 'email', false));
  expect(updatePreferences).toHaveBeenCalledWith({ 'notifications.likes.email': false });
  expect(result.current.preferences.notifications.likes.email).toBe(false);
});

it('AI posts: nested dot path, flag cleared, own error message', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const { result } = await setup();
  updatePreferences.mockRejectedValueOnce(new Error('x'));
  await act(() => result.current.updateAiPostsPreference('ai_posts.triggers.activity_share', true));
  expect(updatePreferences).toHaveBeenCalledWith({ 'ai_posts.triggers.activity_share': true });
  expect(result.current.preferences.ai_posts.triggers.activity_share).toBe(false);
  expect(result.current.isUpdatingAiPosts).toBe(false);
  expect(alert).toHaveBeenCalledWith('common.error', 'settings.aiPostsFailed');
  alert.mockRestore();
});
