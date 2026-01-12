import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { useAuth } from './useAuth';

export function useUnreadCount(pollInterval = 30000) {
  const { isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

    if (isAuthenticated) {
      intervalRef.current = setInterval(fetchUnreadCount, pollInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchUnreadCount, isAuthenticated, pollInterval]);

  return { count, refresh: fetchUnreadCount };
}
