import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CommentaryTabContent, Loading, ScreenContainer, ScreenHeader } from '../../components';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../services/api';
import type { Event } from '../../types/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EventCommentary'>;

/**
 * Full race-commentary timeline for an event. Wraps the shared CommentaryTabContent
 * so commentary has a dedicated home now that the event detail is a single scroll.
 */
export function EventCommentaryScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { eventId } = route.params;

  const { data: event, isLoading } = useFetch<Event>(() => api.getEvent(eventId), {
    deps: [eventId],
    logCategory: 'api',
  });

  const onOpenSettings = useCallback(() => {
    navigation.navigate('EventCommentarySettings', { eventId });
  }, [navigation, eventId]);

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('commentary.raceCommentary', 'Race commentary')}
        showBack
        onBack={() => navigation.goBack()}
      />
      {isLoading || !event ? (
        <Loading fullScreen />
      ) : (
        <CommentaryTabContent
          event={event}
          onOpenSettings={event.is_owner ? onOpenSettings : undefined}
        />
      )}
    </ScreenContainer>
  );
}
