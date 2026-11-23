import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../useAuth';
import { api } from '../../services/api';
import { CACHED_USER_KEY } from '../../services/userCache';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The NetInfo listener registered by the provider, so a test can "turn the network on".
let mockNetListener: ((state: { isConnected: boolean; isInternetReachable: boolean }) => void) | null =
  null;
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: (cb: typeof mockNetListener) => {
      mockNetListener = cb;
      return () => {
        mockNetListener = null;
      };
    },
  },
}));

jest.mock('../../services/api', () => ({
  api: {
    init: jest.fn(),
    isAuthenticated: jest.fn(),
    getUser: jest.fn(),
    clearToken: jest.fn(),
    getPreferences: jest.fn(),
    getImpersonationStatus: jest.fn(),
    setOnUnauthorized: jest.fn(),
    setOnUpgradeRequired: jest.fn(),
    setOnRateLimit: jest.fn(),
  },
}));
jest.mock('../../services/secureStorage', () => ({
  secureStorage: {
    getImpersonationToken: jest.fn().mockResolvedValue(null),
    getAdminToken: jest.fn().mockResolvedValue(null),
    clearAllTokens: jest.fn(),
    clearImpersonationToken: jest.fn(),
    clearAdminToken: jest.fn(),
  },
}));
jest.mock('../../services/logger', () => {
  const fn = () => jest.fn();
  return {
    logger: {
      auth: fn(),
      debug: fn(),
      info: fn(),
      warn: fn(),
      error: fn(),
      clearLogs: fn(),
    },
  };
});
jest.mock('../../services/legal', () => ({
  getConsentStatus: jest.fn().mockResolvedValue({ accepted: true }),
}));
jest.mock('../../services/googleSignIn', () => ({
  configureGoogleSignIn: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOutFromGoogle: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/revenuecat', () => ({
  revenueCatLogIn: jest.fn().mockResolvedValue(undefined),
  revenueCatLogOut: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/pushNotifications', () => ({
  pushNotificationService: {
    registerWithBackend: jest.fn().mockResolvedValue(undefined),
    unregisterFromBackend: jest.fn(),
    reset: jest.fn(),
  },
}));
jest.mock('../../services/backgroundLocation', () => ({
  setActiveActivityId: jest.fn(),
  stopBackgroundLocationTracking: jest.fn(),
}));
jest.mock('../../services/trackingDb', () => ({
  getActiveSession: jest.fn(() => null),
  countUnsynced: jest.fn(),
  discardSession: jest.fn(),
}));
jest.mock('../../i18n', () => ({ changeLanguage: jest.fn() }));
jest.mock('../useUnits', () => ({ syncUnitsPreference: jest.fn() }));
jest.mock('../useMapStyle', () => ({ syncMapStylePreference: jest.fn() }));
jest.mock('../../utils/timezone', () => ({ getDeviceTimeZone: () => null }));

const mocked = api as unknown as Record<string, jest.Mock>;
const OFFLINE = new TypeError('Network request failed');
const cachedUser = { id: 7, username: 'cached', name: 'Cached' };
const freshUser = { id: 7, username: 'fresh', name: 'Fresh' };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

async function renderAuth() {
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

beforeEach(async () => {
  jest.useRealTimers();
  await AsyncStorage.clear();
  Object.values(mocked).forEach((m) => m.mockReset());
  mocked.isAuthenticated.mockReturnValue(true);
  mocked.getPreferences.mockResolvedValue({});
  mockNetListener = null;
});

describe('AuthProvider — cold start without the server', () => {
  it('keeps the token and shows the cached profile when the network is down', async () => {
    await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(cachedUser));
    mocked.getUser.mockRejectedValue(OFFLINE);

    const { result } = await renderAuth();

    expect(mocked.clearToken).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.username).toBe('cached');
  });

  it('keeps the token on a 5xx too, even without a cached profile', async () => {
    mocked.getUser.mockRejectedValue({ status: 503, message: 'Service Unavailable' });

    const { result } = await renderAuth();

    expect(mocked.clearToken).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it('still ends the session when the server rejects the request', async () => {
    await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(cachedUser));
    mocked.getUser.mockRejectedValue({ status: 403, message: 'Forbidden' });

    const { result } = await renderAuth();

    expect(mocked.clearToken).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it('validates the session again once the network is back', async () => {
    await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(cachedUser));
    mocked.getUser.mockRejectedValueOnce(OFFLINE).mockResolvedValueOnce(freshUser);

    const { result } = await renderAuth();
    expect(result.current.user?.username).toBe('cached');
    await waitFor(() => expect(mockNetListener).not.toBeNull());

    jest.useFakeTimers();
    act(() => mockNetListener!({ isConnected: true, isInternetReachable: true }));
    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    jest.useRealTimers();

    await waitFor(() => expect(result.current.user?.username).toBe('fresh'));
    expect(mocked.getUser).toHaveBeenCalledTimes(2);
    expect(mocked.clearToken).not.toHaveBeenCalled();
    // …and the fresh profile replaces the cached one.
    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem(CACHED_USER_KEY)) ?? '{}').username).toBe(
        'fresh',
      ),
    );
  });

  it('does not retry while the phone is still offline', async () => {
    mocked.getUser.mockRejectedValue(OFFLINE);
    await renderAuth();
    await waitFor(() => expect(mockNetListener).not.toBeNull());

    jest.useFakeTimers();
    act(() => mockNetListener!({ isConnected: false, isInternetReachable: false }));
    await act(async () => {
      jest.advanceTimersByTime(120_000);
    });
    jest.useRealTimers();

    expect(mocked.getUser).toHaveBeenCalledTimes(1);
  });
});
