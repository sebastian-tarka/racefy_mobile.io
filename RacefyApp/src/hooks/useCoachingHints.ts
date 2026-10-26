import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { upgradePromptEmitter } from '../services/upgradePromptEmitter';
import type { SubscriptionTier, TrainingProgram, TrainingWeek } from '../types/api';
import { isApiError } from '../utils/errors';
import { triggerHaptic } from './useHaptics';

const POLL_INTERVAL_MS = 5000;

interface Options {
  program: TrainingProgram | null;
  weeks: TrainingWeek[];
  /** Fresh weeks from the progress poll. */
  setWeeks: (weeks: TrainingWeek[]) => void;
  /** Full reload once everything was generated in one go. */
  reload: () => Promise<void>;
  tier: SubscriptionTier;
}

/**
 * "Generate coaching hints" for every week of a programme. The server either
 * answers at once (`completed`) or starts a job; then the weeks are polled
 * every 5 s until each one has its hint. The poll stops on unmount.
 */
export function useCoachingHints({ program, weeks, setWeeks, reload, tier }: Options) {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const announceDone = useCallback(() => {
    triggerHaptic();
    Alert.alert(
      t('training.coachingHints.sectionTitle'),
      t('training.coachingHints.generationComplete'),
    );
  }, [t]);

  const generate = useCallback(async () => {
    if (!program) return;

    if (weeks.every((w) => w.coaching_hint)) {
      Alert.alert(
        t('training.coachingHints.sectionTitle'),
        t('training.coachingHints.allGenerated'),
      );
      return;
    }

    setGenerating(true);
    try {
      const response = await api.generateAllHints(program.id);

      if (response.status === 'completed') {
        await reload();
        setGenerating(false);
        announceDone();
        return;
      }

      const totalWeeks = response.total_weeks || program.total_weeks;
      const weeksPending = response.weeks_pending || 0;
      setProgress({ done: totalWeeks - weeksPending, total: totalWeeks });

      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const updatedWeeks = await api.getWeeks();
          setWeeks(updatedWeeks);

          const remaining = updatedWeeks.filter((w) => !w.coaching_hint).length;
          setProgress({ done: totalWeeks - remaining, total: totalWeeks });

          if (remaining === 0) {
            stopPolling();
            setGenerating(false);
            announceDone();
          }
        } catch (pollErr) {
          logger.error('training', 'Polling hints progress failed', { error: pollErr });
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setGenerating(false);
      logger.error('training', 'Failed to generate coaching hints', { error: err });
      if (
        isApiError(err) &&
        err.status === 403 &&
        (err.data as { required_tier?: string } | undefined)?.required_tier
      ) {
        upgradePromptEmitter.emit('show', { feature: 'coaching_hints_bulk', currentTier: tier });
        return;
      }
      Alert.alert(t('common.error'), t('training.coachingHints.generationFailed'));
    }
  }, [program, weeks, setWeeks, reload, tier, t, stopPolling, announceDone]);

  return { generating, progress, generate };
}
