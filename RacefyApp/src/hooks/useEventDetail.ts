import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { api } from '../services/api';
import { emitRefresh, useRefreshOn } from '../services/refreshEvents';
import type { Event, EventRegistration, Activity, LeaderboardEntry } from '../types/api';

interface UseEventDetailParams {
  eventId: number;
  isAuthenticated: boolean;
  navigateToAuth: () => void;
  navigateBack: () => void;
}

export function useEventDetail({
  eventId,
  isAuthenticated,
  navigateToAuth,
  navigateBack,
}: UseEventDetailParams) {
  const { t } = useTranslation();

  // Data state
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<EventRegistration[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [commentaryCount, setCommentaryCount] = useState(0);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const derived = useMemo(() => {
    if (!event) {
      return {
        spotsText: '',
        availableSpots: null as number | null,
        isFull: false,
        canRegister: false,
        canUnregister: false,
        canStartActivity: false,
        canEdit: false,
        canDelete: false,
        eligibility: {
          can_register: false,
          reason: null as string | null,
          opens_at: null as string | null,
          closes_at: null as string | null,
        },
      };
    }

    const spotsText =
      event.max_participants !== null
        ? `${event.participants_count}/${event.max_participants}`
        : `${event.participants_count}`;

    const availableSpots =
      event.max_participants !== null ? event.max_participants - event.participants_count : null;

    const isFull = availableSpots !== null && availableSpots <= 0;
    const canModifyStatus = event.status === 'upcoming' || event.status === 'cancelled';

    const eligibility = event.registration_eligibility || {
      can_register: event.is_registration_open ?? false,
      reason: null,
      opens_at: event.registration_opens_at,
      closes_at: event.registration_closes_at,
    };

    const canRegister = eligibility.can_register && !event.is_registered;
    const canUnregister = canModifyStatus && (event.is_registered ?? false);
    const canStartActivity = event.status === 'ongoing' && (event.is_registered ?? false);
    const canEdit = event.is_owner ?? false;
    const canDelete = canEdit && canModifyStatus;

    return { spotsText, availableSpots, isFull, canRegister, canUnregister, canStartActivity, canEdit, canDelete, eligibility };
  }, [event]);

  // Fetchers
  const fetchEvent = useCallback(async () => {
    try {
      setError(null);
      const [eventData, participantsData, activitiesData, leaderboardData] = await Promise.all([
        api.getEvent(eventId),
        api.getEventParticipants(eventId).catch(() => []),
        api.getEventActivities(eventId).catch(() => []),
        api.getEventLeaderboard(eventId, 10).catch(() => ({ leaderboard: [] })),
      ]);
      setEvent(eventData);
      setParticipants(participantsData);
      setActivities(activitiesData);
      setLeaderboard(leaderboardData.leaderboard);
    } catch {
      setError(t('eventDetail.failedToLoad'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [eventId, t]);

  const fetchCommentaryCount = useCallback(async () => {
    try {
      const response = await api.getEventCommentary(eventId, { page: 1, per_page: 1 });
      setCommentaryCount(response.meta.total);
    } catch {
      // Silently fail — count is supplementary
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
    fetchCommentaryCount();
  }, [fetchEvent, fetchCommentaryCount]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchEvent();
    fetchCommentaryCount();
  }, [fetchEvent, fetchCommentaryCount]);

  useRefreshOn('events', fetchEvent);

  // Handlers
  const handleRegister = useCallback(async () => {
    if (!isAuthenticated) {
      navigateToAuth();
      return;
    }
    if (!event) return;

    setIsRegistering(true);
    try {
      await api.registerForEvent(event.id);
      setEvent((prev) =>
        prev
          ? { ...prev, is_registered: true, participants_count: prev.participants_count + 1 }
          : null
      );
      fetchEvent();
      Alert.alert(t('common.success'), t('eventDetail.registrationSuccess'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('eventDetail.registrationFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsRegistering(false);
    }
  }, [isAuthenticated, event, navigateToAuth, fetchEvent, t]);

  const handleCancelRegistration = useCallback(async () => {
    if (!event) return;

    Alert.alert(t('eventDetail.cancelRegistration'), t('eventDetail.cancelConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('eventDetail.yesCancel'),
        style: 'destructive',
        onPress: async () => {
          setIsRegistering(true);
          try {
            await api.cancelEventRegistration(event.id);
            setEvent((prev) =>
              prev
                ? {
                    ...prev,
                    is_registered: false,
                    participants_count: prev.participants_count - 1,
                  }
                : null
            );
            fetchEvent();
            Alert.alert(t('common.success'), t('eventDetail.cancelSuccess'));
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : t('eventDetail.cancelFailed');
            Alert.alert(t('common.error'), message);
          } finally {
            setIsRegistering(false);
          }
        },
      },
    ]);
  }, [event, fetchEvent, t]);

  const handleDeleteEvent = useCallback(() => {
    if (!event) return;

    Alert.alert(t('eventDetail.deleteEvent'), t('eventDetail.deleteEventConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteEvent(event.id);
            emitRefresh('events');
            navigateBack();
          } catch {
            Alert.alert(t('common.error'), t('eventDetail.deleteEventFailed'));
          }
        },
      },
    ]);
  }, [event, navigateBack, t]);

  const getRegistrationClosedMessage = useCallback((): string => {
    const eligibility = derived.eligibility;
    if (!eligibility.reason) return t('eventDetail.registrationNotAvailable');

    switch (eligibility.reason) {
      case 'event_completed':
        return t('eventDetail.eventEnded');
      case 'event_cancelled':
        return t('eventDetail.eventCancelled');
      case 'event_not_upcoming':
        return t('eventDetail.registrationNotAvailable');
      case 'too_close_to_event':
        return t('eventDetail.registrationTooLate');
      case 'registration_not_opened':
        return eligibility.opens_at
          ? t('eventDetail.registrationOpensOn', {
              date: format(new Date(eligibility.opens_at), 'MMM d, h:mm a'),
            })
          : t('eventDetail.registrationNotOpened');
      case 'registration_closed':
        return eligibility.closes_at
          ? t('eventDetail.registrationClosedOn', {
              date: format(new Date(eligibility.closes_at), 'MMM d, h:mm a'),
            })
          : t('eventDetail.registrationClosed');
      default:
        return t('eventDetail.registrationNotAvailable');
    }
  }, [derived.eligibility, t]);

  return {
    // Data
    event,
    participants,
    activities,
    leaderboard,
    commentaryCount,
    // Loading
    isLoading,
    isRefreshing,
    isRegistering,
    error,
    // Derived
    ...derived,
    // Handlers
    fetchEvent,
    onRefresh,
    handleRegister,
    handleCancelRegistration,
    handleDeleteEvent,
    getRegistrationClosedMessage,
  };
}
