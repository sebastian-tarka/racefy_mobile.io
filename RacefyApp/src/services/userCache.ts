import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import type { User } from '../types/api';

/**
 * Last profile the server returned for the signed-in account. Lets a cold start
 * without network keep the user signed in (token in SecureStore + this profile)
 * instead of falling back to the guest screen. Listed in `sessionTeardown`, so it
 * goes away with the rest of the account's data on logout or a 401.
 */
export const CACHED_USER_KEY = '@racefy_cached_user';

export async function saveCachedUser(user: User): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
  } catch (error) {
    logger.warn('auth', 'Failed to cache user profile', { error });
  }
}

/** Never throws: a missing or unreadable cache simply means "no profile". */
export async function loadCachedUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHED_USER_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { id?: unknown }).id === 'number'
    ) {
      return parsed as User;
    }
    return null;
  } catch (error) {
    logger.warn('auth', 'Failed to read cached user profile', { error });
    return null;
  }
}
