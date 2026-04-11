import {useCallback, useEffect, useRef, useState} from 'react';
import {api} from '../services/api';
import {logger} from '../services/logger';
import type {InteractionTargetType, InteractionVariant,} from '../components/InteractionButton';
import type {PaginatedResponse, UserInteractor} from '../types/api';

interface UseInteractorsParams {
  /** When false, the hook won't fetch (used to gate on modal visibility) */
  enabled: boolean;
  variant: 'like' | 'boost';
  targetType: InteractionTargetType;
  targetId: number;
  /** For commentary boosts: the parent event id */
  parentId?: number;
}

interface UseInteractorsResult {
  users: UserInteractor[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

async function fetchInteractors(
  variant: InteractionVariant,
  targetType: InteractionTargetType,
  targetId: number,
  parentId: number | undefined,
  page: number
): Promise<PaginatedResponse<UserInteractor>> {
  if (variant === 'like') {
    if (targetType === 'post') return api.getPostLikers(targetId, page);
    if (targetType === 'activity') return api.getActivityLikers(targetId, page);
    if (targetType === 'comment') return api.getCommentLikers(targetId, page);
    throw new Error(`Likers not supported for ${targetType}`);
  }
  if (variant === 'boost') {
    if (targetType === 'activity')
      return api.getActivityBoosters(targetId, page);
    if (targetType === 'commentary') {
      if (parentId == null) {
        throw new Error('commentary boosters require parentId (eventId)');
      }
      return api.getCommentaryBoosters(parentId, targetId, page);
    }
    throw new Error(`Boosters not supported for ${targetType}`);
  }
  throw new Error(`Unsupported variant=${variant}`);
}

export function useInteractors({
  enabled,
  variant,
  targetType,
  targetId,
  parentId,
}: UseInteractorsParams): UseInteractorsResult {
  const [users, setUsers] = useState<UserInteractor[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track in-flight requests to avoid out-of-order updates
  const requestIdRef = useRef(0);

  const fetchPage = useCallback(
    async (pageToFetch: number) => {
      const reqId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchInteractors(
          variant,
          targetType,
          targetId,
          parentId,
          pageToFetch
        );
        if (reqId !== requestIdRef.current) return; // stale
        setUsers((prev) =>
          pageToFetch === 1 ? res.data : [...prev, ...res.data]
        );
        setPage(res.meta.current_page);
        setHasMore(res.meta.current_page < res.meta.last_page);
      } catch (err: any) {
        if (reqId !== requestIdRef.current) return;
        logger.error('api', 'Failed to fetch interactors', {
          error: err?.message || err,
          variant,
          targetType,
          targetId,
        });
        setError(err?.message || 'Failed to load');
      } finally {
        if (reqId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [variant, targetType, targetId, parentId]
  );

  // Reset & fetch when enabled changes from false to true, or when target changes
  useEffect(() => {
    if (!enabled) return;
    setUsers([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    fetchPage(1);
  }, [enabled, variant, targetType, targetId, parentId, fetchPage]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchPage(page + 1);
    }
  }, [isLoading, hasMore, page, fetchPage]);

  const refresh = useCallback(() => {
    fetchPage(1);
  }, [fetchPage]);

  return { users, isLoading, error, hasMore, loadMore, refresh };
}