import { useCallback, useEffect, useState } from 'react';

import { api } from '../services/api';
import { logger } from '../services/logger';
import type { LivePreferences } from '../types/api';

/**
 * Server defaults, used until the real preferences load and if the request
 * fails. `allow_live_comments` defaults to true, `transmission_visibility` to
 * followers — matching the backend, so the UI never implies a stricter or
 * looser setting than is actually in force.
 */
const DEFAULTS: LivePreferences = {
  allow_live_comments: true,
  transmission_visibility: 'followers',
  tts_incoming: true,
};

interface Result {
  preferences: LivePreferences;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  update: (patch: Partial<LivePreferences>) => Promise<boolean>;
  reload: () => Promise<void>;
}

/** Reads and writes the `live` block of the user's profile preferences. */
export function useLivePreferences(enabled = true): Result {
  const [preferences, setPreferences] = useState<LivePreferences>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      const all = await api.getPreferences();
      setPreferences({ ...DEFAULTS, ...(all.live ?? {}) });
      setError(null);
    } catch (err: any) {
      logger.warn('live', 'Failed to load live preferences', { error: err?.message });
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  const update = useCallback(
    async (patch: Partial<LivePreferences>) => {
      setIsSaving(true);
      const previous = preferences;
      // Optimistic: these are toggles, and a lagging switch feels broken.
      setPreferences((prev) => ({ ...prev, ...patch }));
      try {
        // Send only the `live` block — a full-object write would clobber
        // unrelated preferences the client may not have refreshed.
        const all = await api.updatePreferences({ live: { ...preferences, ...patch } });
        setPreferences({ ...DEFAULTS, ...(all.live ?? {}) });
        return true;
      } catch (err: any) {
        setPreferences(previous); // roll back so the UI never lies
        logger.warn('live', 'Failed to save live preferences', { error: err?.message });
        setError(err instanceof Error ? err : new Error(String(err)));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [preferences],
  );

  return { preferences, isLoading, isSaving, error, update, reload };
}
