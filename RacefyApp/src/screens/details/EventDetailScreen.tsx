import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  CommentSection,
  KeyboardAwareScreenLayout,
  Loading,
  ParticipantAvatarsStack,
  ScreenContainer,
  ScreenHeader,
  SocialShareModal,
} from '../../components';
import { RoutePreview } from '../../components/LeafletMap';
import {
  CommentaryPreviewCard,
  EventActionSection,
  EventCourseIntel,
  EventGallery,
  EventHero,
  EventInfoGrid,
  EventRegistrationProgress,
  type OwnerAction,
  SponsorRow,
} from '../../components/event';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { useEventDetail } from '../../hooks/useEventDetail';
import { useEventWatch } from '../../hooks/useEventWatch';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { fontSize, spacing } from '../../theme';
import { formatTotalTime } from '../../utils/formatters';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { User } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

export function EventDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistance, formatElevation } = useUnits();
  const { eventId } = route.params;
  const { isAuthenticated } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const navigateToAuth = useCallback(
    () => navigation.navigate('Auth', { screen: 'Login' }),
    [navigation],
  );
  const navigateBack = useCallback(() => navigation.goBack(), [navigation]);

  const {
    event,
    participants,
    isLoading,
    isRefreshing,
    isRegistering,
    error,
    canRegister,
    canUnregister,
    canEdit,
    fetchEvent,
    onRefresh,
    handleRegister,
    handleCancelRegistration,
    getRegistrationClosedMessage,
  } = useEventDetail({ eventId, isAuthenticated, navigateToAuth, navigateBack });

  const canWatch =
    event?.status === 'upcoming' && !(event?.is_registered ?? false) && !(event?.is_owner ?? false);

  const watch = useEventWatch({
    eventId,
    isAuthenticated,
    initialIsWatching: event?.is_watching ?? false,
    onChange: () => fetchEvent(),
    navigateToAuth,
  });

  const handleUserPress = useCallback(
    (username: string) => {
      if (isAuthenticated) navigation.navigate('UserProfile', { username });
    },
    [isAuthenticated, navigation],
  );

  const handleFinalizeResults = useCallback(() => {
    if (!event) return;
    Alert.alert(
      t('eventDetail.finalizeResults', 'Finalize results'),
      t(
        'eventDetail.finalizeConfirm',
        'Calculate final placements and award points? This cannot be undone.',
      ),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('eventDetail.finalize', 'Finalize'),
          style: 'destructive',
          onPress: async () => {
            setIsFinalizing(true);
            try {
              await api.finalizeEventResults(event.id);
              await fetchEvent();
              Alert.alert(
                t('common.success'),
                t('eventDetail.resultsFinalized', 'Results finalized · points awarded'),
              );
            } catch (err: unknown) {
              const message =
                err instanceof Error
                  ? err.message
                  : t('eventDetail.finalizeFailed', 'Could not finalize results');
              logger.error('api', 'Finalize results failed', { eventId: event.id, error: err });
              Alert.alert(t('common.error'), message);
            } finally {
              setIsFinalizing(false);
            }
          },
        },
      ],
    );
  }, [event, fetchEvent, t]);

  const goToForm = useCallback(
    () => event && navigation.navigate('EventForm', { eventId: event.id }),
    [event, navigation],
  );
  const goToCommentarySettings = useCallback(
    () => event && navigation.navigate('EventCommentarySettings', { eventId: event.id }),
    [event, navigation],
  );
  const goToCommentary = useCallback(
    () => navigation.navigate('EventCommentary', { eventId }),
    [navigation, eventId],
  );
  const goToLive = useCallback(
    () => navigation.navigate('EventLive', { eventId }),
    [navigation, eventId],
  );
  const goToResults = useCallback(
    () => navigation.navigate('EventResults', { eventId }),
    [navigation, eventId],
  );

  const ownerActions = useMemo<OwnerAction[]>(() => {
    if (!event) return [];
    const stage = event.status;
    const actions: OwnerAction[] = [
      {
        key: 'edit',
        icon: 'create-outline',
        label: t('eventDetail.editDetails', 'Edit details'),
        onPress: goToForm,
      },
      {
        key: 'cover',
        icon: 'image-outline',
        label: t('eventDetail.coverPhoto', 'Cover photo'),
        onPress: goToForm,
      },
    ];
    if (stage === 'completed' && !event.results_finalized) {
      actions.push({
        key: 'finalize',
        icon: 'trophy-outline',
        label: t('eventDetail.finalizeResults', 'Finalize results'),
        onPress: handleFinalizeResults,
        highlighted: true,
        loading: isFinalizing,
      });
    } else {
      actions.push({
        key: 'ai',
        icon: 'sparkles-outline',
        label: t('eventDetail.aiCommentary', 'AI commentary'),
        onPress: goToCommentarySettings,
        highlighted: stage === 'ongoing',
      });
    }
    actions.push({
      key: 'points',
      icon: 'cash-outline',
      label: t('eventDetail.pointBudget', 'Point budget'),
      onPress: goToForm,
    });
    return actions;
  }, [event, t, goToForm, goToCommentarySettings, handleFinalizeResults, isFinalizing]);

  if (isLoading) {
    return <Loading fullScreen message={t('eventDetail.loading')} />;
  }

  if (error || !event) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('eventDetail.title')} showBack onBack={navigateBack} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error || t('eventDetail.notFound')}
          </Text>
          <Button title={t('common.tryAgain')} onPress={fetchEvent} variant="primary" />
        </View>
      </ScreenContainer>
    );
  }

  const isUpcoming = event.status === 'upcoming';
  const isOngoing = event.status === 'ongoing';
  const isCompleted = event.status === 'completed';
  const showRegistrationProgress =
    isUpcoming &&
    (event.max_participants != null ||
      event.registration_closes_at != null ||
      event.registration_opens_at != null);
  const galleryPhotos = event.gallery_photos ?? event.post?.photos;

  return (
    <ScreenContainer edges={['bottom']}>
      <CommentSection
        commentableType="event"
        commentableId={eventId}
        onUserPress={isAuthenticated ? (u: User) => handleUserPress(u.username) : undefined}
        renderLayout={({ header, commentList, commentInput }) => (
          <KeyboardAwareScreenLayout
            scrollViewRef={scrollViewRef}
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            keyboardVerticalOffset={{ ios: 120, android: 0 }}
          >
            <EventHero
              event={event}
              onBack={navigateBack}
              onShare={() => setShareModalVisible(true)}
              onEdit={canEdit ? goToForm : undefined}
            />

            <View style={styles.sections}>
              <EventActionSection
                event={event}
                isAuthenticated={isAuthenticated}
                canRegister={canRegister}
                canCancel={canUnregister}
                isRegistering={isRegistering}
                onRegister={handleRegister}
                onCancelRegistration={handleCancelRegistration}
                registrationClosedMessage={getRegistrationClosedMessage()}
                isWatching={watch.isWatching}
                isWatchToggling={watch.isToggling}
                canWatch={canWatch}
                onToggleWatch={watch.toggleWatch}
                ownerActions={ownerActions}
                onViewStandings={goToLive}
                onViewResults={goToResults}
              />

              {(isOngoing || isCompleted) && (
                <View style={styles.padded}>
                  <CommentaryPreviewCard
                    eventId={eventId}
                    isLive={isOngoing}
                    onPress={goToCommentary}
                  />
                </View>
              )}

              <SponsorRow sponsor={event.sponsor} />

              <View style={styles.padded}>
                <EventInfoGrid event={event} />
              </View>

              {showRegistrationProgress && (
                <View style={styles.padded}>
                  <EventRegistrationProgress event={event} />
                </View>
              )}

              {/* Route */}
              {event.route?.geometry && (
                <View style={styles.padded}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                    {t('eventDetail.route', 'Route').toUpperCase()}
                  </Text>
                  <Card style={styles.routeCard} noPadding>
                    <View style={styles.routeMap}>
                      <RoutePreview
                        trackData={event.route.geometry}
                        height={200}
                        backgroundColor={colors.cardBackground}
                        showKmMarkers
                      />
                    </View>
                    <View style={styles.routeStats}>
                      <RouteStat
                        icon="resize-outline"
                        value={formatDistance(event.route.distance)}
                        color={colors.textSecondary}
                        textColor={colors.textPrimary}
                      />
                      <RouteStat
                        icon="trending-up-outline"
                        value={formatElevation(event.route.elevation_gain)}
                        color={colors.textSecondary}
                        textColor={colors.textPrimary}
                      />
                      <RouteStat
                        icon="time-outline"
                        value={`~${formatTotalTime(event.route.estimated_duration)}`}
                        color={colors.textSecondary}
                        textColor={colors.textPrimary}
                      />
                    </View>
                  </Card>
                </View>
              )}

              {/* Course intel */}
              {event.route?.elevation_profile && event.route.elevation_profile.length > 1 && (
                <View style={styles.padded}>
                  <EventCourseIntel route={event.route} />
                </View>
              )}

              {/* About */}
              {event.post?.content ? (
                <View style={styles.padded}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                    {t('eventDetail.about', 'About').toUpperCase()}
                  </Text>
                  <Card>
                    <Text style={[styles.about, { color: colors.textSecondary }]}>
                      {event.post.content}
                    </Text>
                  </Card>
                </View>
              ) : null}

              {/* Gallery */}
              <EventGallery photos={galleryPhotos} />

              {/* Participants preview */}
              {participants.length > 0 && (
                <View style={styles.padded}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                    {t('eventDetail.participants', 'Participants').toUpperCase()} ·{' '}
                    {participants.length}
                  </Text>
                  <Card>
                    <ParticipantAvatarsStack
                      participants={participants}
                      maxVisible={8}
                      onParticipantPress={isAuthenticated ? handleUserPress : undefined}
                    />
                  </Card>
                </View>
              )}

              {/* Comments */}
              <View style={styles.padded}>
                {header}
                {commentList}
                {commentInput}
              </View>
            </View>
          </KeyboardAwareScreenLayout>
        )}
      />

      <SocialShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        type="event"
        id={eventId}
        title={event.post?.title}
        description={event.post?.content}
      />
    </ScreenContainer>
  );
}

function RouteStat({
  icon,
  value,
  color,
  textColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  color: string;
  textColor: string;
}) {
  return (
    <View style={styles.routeStat}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.routeStatText, { color: textColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  padded: {
    paddingHorizontal: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  routeCard: {
    overflow: 'hidden',
  },
  routeMap: {
    height: 200,
  },
  routeStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.md,
  },
  routeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  routeStatText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  about: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    marginVertical: spacing.lg,
    textAlign: 'center',
  },
});
