import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { useAuth } from './useAuth';
import { useForegroundInterval } from './useForegroundInterval';

export function useUnreadCount(pollInterval = 30000) {
  const { isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setCount(0);
      return;
    }

    try {
      const unreadCount = await api.getUnreadCount();
      setCount(unreadCount);
    } catch (err) {
      logger.error('api', 'Failed to fetch unread count', { error: err });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Polls only in the foreground; refreshes at once when the app comes back.
  useForegroundInterval(fetchUnreadCount, isAuthenticated ? pollInterval : null);

  return { count, refresh: fetchUnreadCount };
}
