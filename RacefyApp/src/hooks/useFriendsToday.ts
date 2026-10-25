import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { useRefreshOn } from '../services/refreshEvents';
import { useFetch } from './useFetch';
import type { FriendsTodayResponse } from '../types/api';

/** "Friends today" on Home (GET /home/friends-today). Re-checked on focus. */
export function useFriendsToday(enabled = true, limit = 3) {
  const result = useFetch<FriendsTodayResponse>(() => api.getFriendsToday(limit), {
    enabled,
    deps: [limit],
    logCategory: 'api',
  });
  const { refetch } = result;
  const onRefresh = useCallback(() => {
    if (enabled) void refetch();
  }, [enabled, refetch]);
  useFocusEffect(onRefresh);
  useRefreshOn('feed', onRefresh);
  return {
    rows: result.data?.data ?? [],
    friendsCount: result.data?.meta.friends_count ?? 0,
    refetch,
  };
}
