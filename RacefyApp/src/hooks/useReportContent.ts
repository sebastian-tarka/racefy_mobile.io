import { useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { useTranslation } from 'react-i18next';
import type { ReportableType, ReportReason } from '../types/api';

interface UseReportContentReturn {
  isLoading: boolean;
  error: string | null;
  submitReport: (
    reportableType: ReportableType,
    reportableId: number,
    reason: ReportReason,
    description?: string,
    onReportSuccess?: () => void
  ) => Promise<void>;
}

/**
 * Hook for reporting content (posts, comments, activities, users, messages)
 * Features:
 * - Accepts reason + optional description
 * - Shows success confirmation (Alert.alert)
 * - Haptic feedback
 * - Logging all reports
 * - Callback support (onReportSuccess)
 */
export function useReportContent(): UseReportContentReturn {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReport = async (
    reportableType: ReportableType,
    reportableId: number,
    reason: ReportReason,
    description?: string,
    onReportSuccess?: () => void
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await api.createReport({
        reportable_type: reportableType,
        reportable_id: reportableId,
        reason,
        description,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      logger.info('general', 'Content reported', {
        reportableType,
        reportableId,
        reason,
        hasDescription: !!description,
      });

      // Show success message
      Alert.alert(
        t('reporting.reportedTitle'),
        t('reporting.reportedMessage'),
        [{ text: t('common.ok') }]
      );

      onReportSuccess?.();
    } catch (err: any) {
      const errorMessage = err?.message || t('reporting.reportError');
      setError(errorMessage);
      logger.error('general', 'Failed to report content', {
        reportableType,
        reportableId,
        reason,
        error: err,
      });

      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    submitReport,
  };
}
