import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { getCurrentLanguage } from '../i18n';
import type {
  EventCommentary,
  CommentaryListResponse,
  CommentaryLanguage,
} from '../types/api';

interface UseEventCommentaryFeedOptions {
  eventId: number;
  language?: CommentaryLanguage;
  perPage?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export function useEventCommentaryFeed({
  eventId,
  language,
  perPage = 50,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
}: UseEventCommentaryFeedOptions) {
  const [commentaries, setCommentaries] = useState<EventCommentary[]>([]);
  const [meta, setMeta] = useState<CommentaryListResponse['meta'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(0);
  const [isPollingActive, setIsPollingActive] = useState(false);

  // Language management
  const [selectedLanguage, setSelectedLanguageState] = useState<CommentaryLanguage>(
    language || (getCurrentLanguage() as CommentaryLanguage)
  );
  const [fallbackLanguage, setFallbackLanguage] = useState<CommentaryLanguage | null>(null);
  const [languagesWithContent, setLanguagesWithContent] = useState<CommentaryLanguage[]>([]);

  // Active language: fallback takes precedence over selected (when auto-detected)
  const activeLanguage = fallbackLanguage ?? selectedLanguage;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const changeLanguage = useCallback((lang: CommentaryLanguage) => {
    setSelectedLanguageState(lang);
    setFallbackLanguage(null);
  }, []);

  const fetchCommentary = useCallback(
    async (reset = false, silent = false) => {
      if (isLoading && !silent) return;

      if (!silent) {
        if (reset) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
      }
      setError(null);

      try {
        const currentPage = reset ? 1 : page;
        // On reset, always probe with the user-selected language to detect fallback need.
        // On pagination, use the active language (which may be the fallback).
        const langToFetch = reset ? selectedLanguage : activeLanguage;
        const response = await api.getEventCommentary(eventId, {
          per_page: perPage,
          page: currentPage,
          language: langToFetch,
        });

        if (!isMountedRef.current) return;

        const lwc: CommentaryLanguage[] = response.meta.languages_with_content ?? [];

        if (reset) {
          setLanguagesWithContent(lwc);
        }

        // Auto-fallback: only on initial/reset load when the result is empty and
        // the user's language has no published content but another language does.
        if (
          reset &&
          response.data.length === 0 &&
          lwc.length > 0 &&
          !lwc.includes(selectedLanguage)
        ) {
          const fallbackLang = lwc[0];
          setFallbackLanguage(fallbackLang);

          // Second fetch with the fallback language
          const fbResponse = await api.getEventCommentary(eventId, {
            per_page: perPage,
            page: 1,
            language: fallbackLang,
          });

          if (!isMountedRef.current) return;

          setCommentaries(fbResponse.data);
          setMeta(fbResponse.meta);
          setHasMore(fbResponse.meta.current_page < fbResponse.meta.last_page);
          setPage(2);
          return;
        }

        setCommentaries((prev) => {
          if (reset) return response.data;
          // Deduplicate by commentary ID when loading more
          const existingIds = new Set(prev.map((c) => c.id));
          const newItems = response.data.filter((c) => !existingIds.has(c.id));
          return [...prev, ...newItems];
        });

        setMeta(response.meta);
        setHasMore(response.meta.current_page < response.meta.last_page);

        if (reset) {
          setPage(2);
        } else {
          setPage(currentPage + 1);
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err?.message || 'Failed to load commentary');
        }
      } finally {
        if (isMountedRef.current && !silent) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [eventId, page, perPage, selectedLanguage, activeLanguage, isLoading]
  );

  const refresh = useCallback(() => {
    setFallbackLanguage(null);
    setPage(1);
    setHasMore(true);
    fetchCommentary(true, false);
  }, [fetchCommentary]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchCommentary(false, false);
    }
  }, [hasMore, isLoading, fetchCommentary]);

  const silentRefresh = useCallback(() => {
    // Silently refresh first page to check for new commentary
    api
      .getEventCommentary(eventId, {
        per_page: perPage,
        page: 1,
        language: activeLanguage,
      })
      .then((response) => {
        if (!isMountedRef.current) return;

        // Check if there are new items
        const existingIds = new Set(commentaries.map((c) => c.id));
        const newItems = response.data.filter((c) => !existingIds.has(c.id));

        if (newItems.length > 0) {
          // Prepend new items to the list
          setCommentaries((prev) => [...newItems, ...prev]);
        }

        setMeta(response.meta);
      })
      .catch(() => {
        // Silently fail on background refresh
      });
  }, [eventId, perPage, activeLanguage, commentaries]);

  // Initial load — re-run when eventId or user-selected language changes.
  // Deliberately excludes fallbackLanguage to avoid re-triggering on auto-fallback.
  useEffect(() => {
    fetchCommentary(true, false);
  }, [eventId, selectedLanguage]);

  // Auto-refresh polling for ongoing events
  useEffect(() => {
    if (!autoRefresh || !meta?.commentary_enabled) {
      setIsPollingActive(false);
      setSecondsUntilRefresh(0);
      return;
    }

    // Start polling
    setIsPollingActive(true);
    setSecondsUntilRefresh(Math.floor(refreshInterval / 1000));

    // Set up data refresh interval
    intervalRef.current = setInterval(() => {
      silentRefresh();
      setSecondsUntilRefresh(Math.floor(refreshInterval / 1000));
    }, refreshInterval);

    // Set up countdown interval (updates every second)
    countdownIntervalRef.current = setInterval(() => {
      setSecondsUntilRefresh((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setIsPollingActive(false);
      setSecondsUntilRefresh(0);
    };
  }, [autoRefresh, refreshInterval, meta, silentRefresh]);

  // Handle boost change with cross-item constraint (one boost per event)
  const handleBoostChange = useCallback(
    (commentaryId: number, isBoosted: boolean, newBoostsCount: number) => {
      setCommentaries((prev) =>
        prev.map((c) => {
          if (c.id === commentaryId) {
            return { ...c, boosts_count: newBoostsCount, user_boosted: isBoosted };
          }
          // If boosting a new one, auto-unboost the previously boosted one
          if (isBoosted && c.user_boosted) {
            return {
              ...c,
              boosts_count: Math.max(0, (c.boosts_count ?? 0) - 1),
              user_boosted: false,
            };
          }
          return c;
        })
      );
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  return {
    commentaries,
    meta,
    isLoading,
    isRefreshing,
    error,
    hasMore,
    refresh,
    loadMore,
    // Computed properties for convenience
    isEmpty: commentaries.length === 0 && !isLoading,
    isCommentaryEnabled: meta?.commentary_enabled ?? false,
    tokensUsed: meta?.tokens_used ?? 0,
    tokenLimit: meta?.token_limit ?? 0,
    availableLanguages: (meta?.available_languages ?? {}) as Record<CommentaryLanguage, string>,
    eventLanguages: meta?.event_languages ?? [],
    // Language management
    selectedLanguage,
    activeLanguage,
    fallbackLanguage,
    languagesWithContent,
    changeLanguage,
    // Polling status
    isPollingActive,
    secondsUntilRefresh,
    // Boost
    handleBoostChange,
  };
}
