import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

/**
 * AsyncStorage keys that describe the signed-in account rather than the device:
 * cached server data, state of a recording or gym session in progress, GPS
 * buffers, the account's opt-ins. Everything here is removed when the session
 * ends (logout, 401) or the account context switches (impersonation), so the
 * next account on the same phone never sees or inherits the previous one's data.
 *
 * Device preferences stay: theme, language, units, map style, haptics, view
 * modes, dismissed update banners, the logger's session id.
 *
 * Tokens live in SecureStore (`services/secureStorage`) and are cleared
 * separately; the SQLite tracking DB is user-tagged and filtered by owner
 * (`services/queueOwnership`), not wiped — undelivered activities must survive
 * until their owner signs in again.
 */
const USER_SCOPED_STORAGE_KEYS: readonly string[] = [
  // Cached server data
  '@racefy_home_data',
  '@racefy_home_config',
  '@racefy_seen_ranks',
  '@racefy:audioCoach:settings',
  // Account opt-ins
  '@racefy_health_sync_enabled',
  // Recording in progress / background GPS state
  '@racefy_active_activity_id',
  '@racefy_gps_profile',
  '@racefy_last_bg_position',
  '@racefy_last_sync_status',
  '@racefy_bg_sync_state',
  '@racefy_bg_errors',
  '@racefy_location_buffer',
  '@racefy_foreground_buffer',
  // Gym session in progress
  '@racefy:workout:session',
  '@racefy:workout:engine',
  '@racefy:workout:timeAnchor',
  '@racefy:workout:lastGoal',
  '@racefy:workout:goalNotificationId',
  '@racefy:workout:lastCueMs',
  // Audio coach: subscription tier mirror + background milestones of the current activity
  '@racefy:audioCoach:tier',
  '@racefy:audioCoach:bgStartTime',
  '@racefy:audioCoach:bgDistance',
  '@racefy:audioCoach:bgMilestones',
  '@racefy:audioCoach:bgPassedMilestones',
  '@racefy:audioCoach:bgLastThreshold',
  '@racefy:audioCoach:bgSimStartTime',
  '@racefy:audio:focus',
];

/** Remove every user-scoped key. Never throws: a failed cleanup must not block signing out. */
export async function clearUserScopedStorage(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([...USER_SCOPED_STORAGE_KEYS]);
  } catch (error) {
    logger.warn('auth', 'Failed to clear user-scoped storage', { error });
  }
}
