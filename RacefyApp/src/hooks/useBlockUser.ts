import { useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { emitRefresh } from '../services/refreshEvents';
import { useTranslation } from 'react-i18next';

interface UseBlockUserReturn {
  isLoading: boolean;
  error: string | null;
  blockUser: (userId: number, username: string, onBlockSuccess?: () => void) => Promise<void>;
  unblockUser: (userId: number, onUnblockSuccess?: () => void) => Promise<void>;
}

/**
 * Hook for blocking and unblocking users
 * Features:
 * - Confirmation dialog before blocking (Alert.alert with destructive style)
 * - Success feedback after block/unblock
 * - Haptic feedback
 * - Error handling with user-friendly messages
 * - Callback support (onBlockSuccess, onUnblockSuccess)
 */
export function useBlockUser(): UseBlockUserReturn {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blockUser = async (
    userId: number,
    username: string,
    onBlockSuccess?: () => void
  ): Promise<void> => {
    return new Promise((resolve) => {
      // Show confirmation dialog
      Alert.alert(
        t('blocking.confirmTitle'),
        t('blocking.confirmMessage', { username }),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: () => resolve(),
          },
          {
            text: t('blocking.blockAction'),
            style: 'destructive',
            onPress: async () => {
              setIsLoading(true);
              setError(null);

              try {
                await api.blockUser(userId);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                logger.auth('User blocked', { userId, username });
                emitRefresh('feed');

                // Show success message
                Alert.alert(
                  t('blocking.blockedTitle'),
                  t('blocking.blockedMessage', { username }),
                  [{ text: t('common.ok') }]
                );

                onBlockSuccess?.();
                resolve();
              } catch (err: any) {
                const errorMessage = err?.message || t('blocking.blockError');
                setError(errorMessage);
                logger.error('auth', 'Failed to block user', { userId, error: err });

                Alert.alert(t('common.error'), errorMessage);
                resolve();
              } finally {
                setIsLoading(false);
              }
            },
          },
        ]
      );
    });
  };

  const unblockUser = async (
    userId: number,
    onUnblockSuccess?: () => void
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await api.unblockUser(userId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      logger.auth('User unblocked', { userId });

      onUnblockSuccess?.();
    } catch (err: any) {
      const errorMessage = err?.message || t('blocking.unblockError');
      setError(errorMessage);
      logger.error('auth', 'Failed to unblock user', { userId, error: err });

      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    blockUser,
    unblockUser,
  };
}
