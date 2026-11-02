import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { upgradePromptEmitter } from '../services/upgradePromptEmitter';
import type { SubscriptionTier, TrainingProgram, TrainingWeek } from '../types/api';
import { isApiError } from '../utils/errors';
import { triggerHaptic } from './useHaptics';
import type { PlanGeneration } from './usePlanGeneration';

interface Options {
  program: TrainingProgram | null;
  weeks: TrainingWeek[];
  /** Full reload once the server answered `completed` on the spot. */
  reload: () => Promise<void>;
  tier: SubscriptionTier;
  /** The plan's generation status — the single source of progress. */
  generation: PlanGeneration;
}

/**
 * "Generate coaching hints" for every week of a programme (Pro).
 *
 * The server answers at once (`completed`) or marks the weeks `pending` and
 * fans out one job per week. Progress then comes from `usePlanGeneration`
 * (server counts, survives an app restart, stops on failure or the cap) —
 * not from counting `coaching_hint` on the weeks list, which polled forever
 * when a job died halfway.
 */
export function useCoachingHints({ program, weeks, reload, tier, generation }: Options) {
  const { t } = useTranslation();
  const [starting, setStarting] = useState(false);
  // The batch this screen started: only it gets the closing alert.
  const batchRef = useRef(false);
  const { status, timedOut, refresh } = generation;

  const hintsPending = status?.hints.pending ?? 0;
  const total = status?.hints.total ?? weeks.length;
  const progress = { done: Math.max(0, total - hintsPending), total };
  const generating = starting || hintsPending > 0;

  useEffect(() => {
    if (!batchRef.current || !status) return;

    if (timedOut) {
      batchRef.current = false;
      Alert.alert(
        t('training.coachingHints.sectionTitle'),
        t('training.coachingHints.generationTakingLonger'),
      );
      return;
    }

    if (status.hints.pending === 0) {
      batchRef.current = false;
      triggerHaptic();
      Alert.alert(
        t('training.coachingHints.sectionTitle'),
        status.hints.failed > 0
          ? t('training.coachingHints.generationPartlyFailed', {
              failed: status.hints.failed,
              total: status.hints.total,
            })
          : t('training.coachingHints.generationComplete'),
      );
    }
  }, [status, timedOut, t]);

  const generate = useCallback(async () => {
    if (!program) return;

    if (weeks.every((w) => w.coaching_hint)) {
      Alert.alert(
        t('training.coachingHints.sectionTitle'),
        t('training.coachingHints.allGenerated'),
      );
      return;
    }

    setStarting(true);
    try {
      const response = await api.generateAllHints(program.id);

      if (response.status === 'completed') {
        await reload();
        triggerHaptic();
        Alert.alert(
          t('training.coachingHints.sectionTitle'),
          t('training.coachingHints.generationComplete'),
        );
        return;
      }

      batchRef.current = true;
      await refresh();
    } catch (err) {
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
    } finally {
      setStarting(false);
    }
  }, [program, weeks, reload, refresh, tier, t]);

  return { generating, progress, generate };
}
