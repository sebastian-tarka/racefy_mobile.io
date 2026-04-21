import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { emitRefresh } from '../services/refreshEvents';
import { Alert } from 'react-native';

export type TrainingDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday

interface TrainingRemindersState {
  enabled: boolean;
  days: TrainingDay[];
  time: string; // "HH:MM"
  pushEnabled: boolean;
  loading: boolean;
  saving: boolean;
}

export function useTrainingReminders() {
  const { t } = useTranslation();
  const [state, setState] = useState<TrainingRemindersState>({
    enabled: false,
    days: [],
    time: '08:00',
    pushEnabled: false,
    loading: true,
    saving: false,
  });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdate = useRef<Record<string, any> | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      logger.debug('general', 'Training reminders: reloading preferences');
      const prefs = await api.getPreferences();
      const trainingReminders = (prefs as any).training_reminders;
      const notifications = (prefs as any).notifications;

      setState(prev => ({
        ...prev,
        enabled: trainingReminders?.enabled ?? false,
        days: trainingReminders?.days ?? [],
        time: trainingReminders?.time ?? '08:00',
        pushEnabled: notifications?.training_reminder?.push ?? false,
        loading: false,
      }));
    } catch (error) {
      logger.error('api', 'Failed to load training reminders preferences', { error });
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const debouncedApiUpdate = useCallback((data: Record<string, any>) => {
    // Merge with any pending update
    pendingUpdate.current = { ...(pendingUpdate.current || {}), ...data };

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      const updateData = pendingUpdate.current;
      pendingUpdate.current = null;
      if (!updateData) return;

      setState(prev => ({ ...prev, saving: true }));
      try {
        await api.updatePreferences(updateData);
        logger.debug('general', 'Training reminders saved, emitting refresh', { updateData });
        emitRefresh('training');
      } catch (error) {
        logger.error('api', 'Failed to update training reminders', { error });
        Alert.alert(t('common.error'), t('settings.updateFailed'));
        // Reload to revert
        loadPreferences();
      } finally {
        setState(prev => ({ ...prev, saving: false }));
      }
    }, 300);
  }, [t]);

  const toggleEnabled = useCallback(() => {
    setState(prev => {
      const newEnabled = !prev.enabled;
      debouncedApiUpdate({ 'training_reminders.enabled': newEnabled });
      return { ...prev, enabled: newEnabled };
    });
  }, [debouncedApiUpdate]);

  const toggleDay = useCallback((day: TrainingDay) => {
    setState(prev => {
      const newDays = prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day].sort();
      debouncedApiUpdate({ 'training_reminders.days': newDays });
      return { ...prev, days: newDays };
    });
  }, [debouncedApiUpdate]);

  const setTime = useCallback((time: string) => {
    setState(prev => {
      debouncedApiUpdate({ 'training_reminders.time': time });
      return { ...prev, time };
    });
  }, [debouncedApiUpdate]);

  const togglePush = useCallback(() => {
    setState(prev => {
      const newPush = !prev.pushEnabled;
      debouncedApiUpdate({ 'notifications.training_reminder.push': newPush });
      return { ...prev, pushEnabled: newPush };
    });
  }, [debouncedApiUpdate]);

  return {
    enabled: state.enabled,
    days: state.days,
    time: state.time,
    pushEnabled: state.pushEnabled,
    loading: state.loading,
    saving: state.saving,
    toggleEnabled,
    toggleDay,
    setTime,
    togglePush,
    reload: loadPreferences,
  };
}