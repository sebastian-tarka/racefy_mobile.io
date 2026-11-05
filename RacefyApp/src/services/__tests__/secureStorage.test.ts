import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getAuthToken } from '../backgroundApiClient';
import { secureStorage } from '../secureStorage';

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock('../logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
// backgroundApiClient pulls these in at import time; neither matters for the token.
jest.mock('../../config/api', () => ({ API_BASE_URL: 'https://example.test/api' }));
jest.mock('../../i18n', () => ({ getCurrentLanguage: () => 'en' }));

const secure = SecureStore as jest.Mocked<typeof SecureStore>;
const plain = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const TOKEN = 'racefy_auth_token';
const FALLBACK = '@secure_racefy_auth_token';
const LEGACY = '@racefy_token';

/** Both stores as in-memory maps, so a test reads like what is on the device. */
let keychain: Record<string, string>;
let asyncStorage: Record<string, string>;

beforeEach(() => {
  jest.clearAllMocks();
  keychain = {};
  asyncStorage = {};
  secure.isAvailableAsync.mockResolvedValue(true);
  secure.getItemAsync.mockImplementation(async (key) => keychain[key] ?? null);
  secure.setItemAsync.mockImplementation(async (key, value) => {
    keychain[key] = value;
  });
  secure.deleteItemAsync.mockImplementation(async (key) => {
    delete keychain[key];
  });
  plain.getItem.mockImplementation(async (key) => asyncStorage[key] ?? null);
  plain.setItem.mockImplementation(async (key, value) => {
    asyncStorage[key] = value;
  });
  plain.removeItem.mockImplementation(async (key) => {
    delete asyncStorage[key];
  });
});

describe('reading the token', () => {
  it('comes from SecureStore', async () => {
    keychain[TOKEN] = 'real';

    await expect(secureStorage.getToken()).resolves.toBe('real');
    await expect(getAuthToken()).resolves.toBe('real');
  });

  it('ignores an AsyncStorage copy when SecureStore works but is empty', async () => {
    asyncStorage[FALLBACK] = 'planted';
    asyncStorage[LEGACY] = 'ancient';

    await expect(secureStorage.getToken()).resolves.toBeNull();
    await expect(getAuthToken()).resolves.toBeNull();
  });

  it('does not fall back to AsyncStorage when SecureStore throws', async () => {
    asyncStorage[FALLBACK] = 'planted';
    secure.getItemAsync.mockRejectedValue(new Error('keystore invalidated'));

    await expect(secureStorage.getToken()).resolves.toBeNull();
    await expect(getAuthToken()).resolves.toBeNull();
  });

  it('uses the AsyncStorage copy only where SecureStore does not exist', async () => {
    secure.isAvailableAsync.mockResolvedValue(false);
    asyncStorage[FALLBACK] = 'emulator';

    await expect(secureStorage.getToken()).resolves.toBe('emulator');
    await expect(getAuthToken()).resolves.toBe('emulator');
    expect(secure.getItemAsync).not.toHaveBeenCalled();
  });
});

describe('migrateLegacyTokens', () => {
  it('moves a legacy token into SecureStore and removes the plain copy', async () => {
    asyncStorage[LEGACY] = 'old-session';

    await secureStorage.migrateLegacyTokens();

    expect(keychain[TOKEN]).toBe('old-session');
    expect(asyncStorage[LEGACY]).toBeUndefined();
  });

  it('keeps the legacy token when the secure write fails, to try again next start', async () => {
    asyncStorage[LEGACY] = 'old-session';
    secure.setItemAsync.mockRejectedValue(new Error('keystore busy'));

    await secureStorage.migrateLegacyTokens();

    expect(asyncStorage[LEGACY]).toBe('old-session');
    expect(keychain[TOKEN]).toBeUndefined();
  });

  it('moves a fallback copy written while SecureStore was reported unavailable', async () => {
    asyncStorage[FALLBACK] = 'written-on-a-bad-day';

    await secureStorage.migrateLegacyTokens();

    expect(keychain[TOKEN]).toBe('written-on-a-bad-day');
    expect(asyncStorage[FALLBACK]).toBeUndefined();
  });

  it('never replaces the token SecureStore already holds; the plain copy just goes', async () => {
    keychain[TOKEN] = 'current';
    asyncStorage[LEGACY] = 'older';
    asyncStorage[FALLBACK] = 'planted';

    await secureStorage.migrateLegacyTokens();

    expect(keychain[TOKEN]).toBe('current');
    expect(asyncStorage).toEqual({});
  });

  it('leaves AsyncStorage alone where SecureStore does not exist', async () => {
    secure.isAvailableAsync.mockResolvedValue(false);
    asyncStorage[FALLBACK] = 'emulator';

    await secureStorage.migrateLegacyTokens();

    expect(asyncStorage[FALLBACK]).toBe('emulator');
    expect(secure.setItemAsync).not.toHaveBeenCalled();
  });
});

describe('clearing', () => {
  it('removes the token from both stores', async () => {
    keychain[TOKEN] = 'real';
    asyncStorage[FALLBACK] = 'copy';

    await secureStorage.clearToken();

    expect(keychain[TOKEN]).toBeUndefined();
    expect(asyncStorage[FALLBACK]).toBeUndefined();
  });
});
