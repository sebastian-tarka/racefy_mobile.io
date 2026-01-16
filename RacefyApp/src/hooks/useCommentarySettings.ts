import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import type {
  CommentarySettings,
  UpdateCommentarySettingsRequest,
} from '../types/api';

export function useCommentarySettings(eventId: number) {
  const [settings, setSettings] = useState<CommentarySettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getCommentarySettings(eventId);
      setSettings(data);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load commentary settings';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  const updateSettings = useCallback(
    async (updates: UpdateCommentarySettingsRequest) => {
      setIsSaving(true);
      setError(null);

      try {
        const data = await api.updateCommentarySettings(eventId, updates);
        setSettings(data);
        return data;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to update commentary settings';
        setError(errorMessage);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [eventId]
  );

  // Load settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    isSaving,
    error,
    refresh: fetchSettings,
    updateSettings,
    // Computed properties for convenience
    isEnabled: settings?.enabled ?? false,
    tokensUsed: settings?.tokens_used ?? 0,
    tokenLimit: settings?.token_limit ?? 0,
    tokenUsagePercent:
      settings && settings.token_limit
        ? (settings.tokens_used / settings.token_limit) * 100
        : 0,
    isNearLimit:
      settings && settings.token_limit
        ? settings.tokens_used / settings.token_limit > 0.8
        : false,
  };
}
