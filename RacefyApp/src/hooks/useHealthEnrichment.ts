import { useCallback } from 'react';
import { api } from '../services/api';
import {
  healthService,
  isHealthSyncEnabled,
} from '../services/healthService';
import { logger } from '../services/logger';
import type { Activity } from '../types/api';

/**
 * Hook for enriching a completed activity with heart rate data
 * from Health Connect (Android) or Apple HealthKit (iOS).
 *
 * This is fire-and-forget — it never blocks the main finish flow.
 */
export function useHealthEnrichment() {
  const enrichActivityWithHeartRate = useCallback(
    async (activity: Activity): Promise<Activity> => {
      try {
        // 1. Check if health sync is enabled
        const syncEnabled = await isHealthSyncEnabled();
        if (!syncEnabled) {
          logger.debug('activity', 'Health sync disabled, skipping HR enrichment');
          return activity;
        }

        // 2. Only enrich app-recorded activities (not imports)
        if (activity.source !== 'app') {
          logger.debug('activity', 'Activity not from app, skipping HR enrichment', {
            source: activity.source,
          });
          return activity;
        }

        // 3. Skip if HR data already present
        if (activity.hr_data_source) {
          logger.debug('activity', 'Activity already has HR data', {
            source: activity.hr_data_source,
          });
          return activity;
        }

        // 4. Check permissions
        const hasPermission = await healthService.hasHeartRatePermission();
        if (!hasPermission) {
          logger.info('activity', 'No HR permission, skipping enrichment');
          return activity;
        }

        // 5. Query HR samples from activity time window
        const startTime = new Date(activity.started_at);
        const endTime = activity.ended_at
          ? new Date(activity.ended_at)
          : new Date();

        logger.info('activity', 'Querying HR samples for enrichment', {
          activityId: activity.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

        const samples = await healthService.getHeartRateSamples(startTime, endTime);

        if (samples.length === 0) {
          logger.info('activity', 'No HR samples found for activity window', {
            activityId: activity.id,
          });
          return activity;
        }

        logger.info('activity', 'HR samples found, sending to server', {
          activityId: activity.id,
          sampleCount: samples.length,
        });

        // 6. Send to backend
        const enrichedActivity = await api.sendHealthData(activity.id, {
          heart_rate_samples: samples,
          source: healthService.getSource(),
        });

        logger.info('activity', 'Activity enriched with HR data', {
          activityId: enrichedActivity.id,
          avgHr: enrichedActivity.avg_heart_rate,
          maxHr: enrichedActivity.max_heart_rate,
          source: enrichedActivity.hr_data_source,
        });

        return enrichedActivity;
      } catch (error) {
        // Never block on failure — log and return original activity
        logger.error('activity', 'Failed to enrich activity with HR data', {
          activityId: activity.id,
          error,
        });
        return activity;
      }
    },
    [],
  );

  return { enrichActivityWithHeartRate };
}
