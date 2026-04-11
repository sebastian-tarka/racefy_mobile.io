import {useMemo} from 'react';
import * as Application from 'expo-application';
import {useAppConfig} from '../contexts/AppConfigContext';
import {compareVersions} from '../utils/semver';
import type {AppUpdateConfig} from '../types/api';

export interface AppVersionState {
  /** Native binary version of the running app. */
  currentAppVersion: string;
  /** Server-provided update config (or null when backend omits it). */
  update: AppUpdateConfig | null;
  /** True when the running app is below `minimum_version` — must be blocked. */
  forceUpdate: boolean;
  /** True when a newer `current_version` is available — show dismissable banner. */
  softUpdate: boolean;
  /** True until the first /config/app fetch resolves. */
  isLoading: boolean;
}

const NATIVE_APP_VERSION = Application.nativeApplicationVersion ?? '0.0.0';

/**
 * Selector over {@link useAppConfig} that resolves the version-gating
 * decision (force vs soft update) for the running app.
 *
 * Decision rules:
 * - **forceUpdate**: trust the server's `force_update` flag when present;
 *   otherwise fall back to `installedVersion < minimum_version`.
 * - **softUpdate**: `installedVersion < current_version` and not already
 *   forced (force takes UI precedence).
 *
 * Fail-open: if the server omits `update`, returns malformed semver, or
 * the request fails, neither flag is set — we never block users on a
 * misconfigured backend.
 */
export function useAppVersion(): AppVersionState {
  const { config, isLoading } = useAppConfig();

  return useMemo(() => {
    const update = config?.update ?? null;
    if (!update) {
      return {
        currentAppVersion: NATIVE_APP_VERSION,
        update: null,
        forceUpdate: false,
        softUpdate: false,
        isLoading,
      };
    }

    // Server's explicit decision wins. Fall back to semver compare when
    // the flag is absent so older backends still work.
    const belowMinimum =
      compareVersions(NATIVE_APP_VERSION, update.minimum_version) < 0;
    const forceUpdate =
      typeof update.force_update === 'boolean' ? update.force_update : belowMinimum;

    const belowCurrent =
      compareVersions(NATIVE_APP_VERSION, update.current_version) < 0;

    return {
      currentAppVersion: NATIVE_APP_VERSION,
      update,
      forceUpdate,
      // Soft update only when there IS a newer version AND we're not
      // already forcing (force renders a different, blocking UI).
      softUpdate: belowCurrent && !forceUpdate,
      isLoading,
    };
  }, [config, isLoading]);
}