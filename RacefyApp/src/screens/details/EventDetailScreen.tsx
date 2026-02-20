import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Loading,
  Badge,
  ScreenHeader,
  CommentaryTabContent,
  EventTabs,
  SocialShareModal,
  ScreenContainer,
  EventDetailsTabContent,
  EventParticipantsTabContent,
  EventLeaderboardTabContent,
} from '../../components';
import type { EventTabType } from '../../components/EventTabs';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useKeyboardVisible } from '../../hooks/useKeyboardVisible';
import { useCollapsibleHeader } from '../../hooks/useCollapsibleHeader';
import { useEventDetail } from '../../hooks/useEventDetail';
import { spacing, fontSize, borderRadius } from '../../theme';
import { fixStorageUrl } from '../../config/api';
import { getSportIcon } from '../../utils/sportIcon';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

export function EventDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { eventId } = route.params;
  const { isAuthenticated } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const isKeyboardVisible = useKeyboardVisible();
  const { collapsibleHeight, collapsibleOpacity, handleTabScroll, handleTabChange } =
    useCollapsibleHeader();

  const [activeTab, setActiveTab] = useState<EventTabType>('details');
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const navigateToAuth = useCallback(
    () => navigation.navigate('Auth', { screen: 'Login' }),
    [navigation]
  );
  const navigateBack = useCallback(() => navigation.goBack(), [navigation]);

  const {
    event,
    participants,
    activities,
    leaderboard,
    commentaryCount,
    isLoading,
    isRefreshing,
    isRegistering,
    error,
    spotsText,
    availableSpots,
    isFull,
    canRegister,
    canUnregister,
    canStartActivity,
    canEdit,
    canDelete,
    fetchEvent,
    onRefresh,
    handleRegister,
    handleCancelRegistration,
    handleDeleteEvent,
    getRegistrationClosedMessage,
  } = useEventDetail({ eventId, isAuthenticated, navigateToAuth, navigateBack });

  const scrollToBottom = useCallback(() => {
    const delay = Platform.OS === 'ios' ? 300 : 150;
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, delay);
  }, []);

  const handleUserPress = useCallback(
    (username: string) => {
      if (isAuthenticated) {
        navigation.navigate('UserProfile', { username });
      }
    },
    [isAuthenticated, navigation]
  );

  const handleActivityPress = useCallback(
    (activityId: number) => {
      navigation.navigate('ActivityDetail', { activityId });
    },
    [navigation]
  );

  const handleStartActivity = useCallback(() => {
    if (!event) return;
    navigation.navigate('Main', { screen: 'Record', params: { preselectedEvent: event } });
  }, [event, navigation]);

  const handleOpenCommentarySettings = useCallback(() => {
    if (!event) return;
    navigation.navigate('EventCommentarySettings', { eventId: event.id });
  }, [event, navigation]);

  const onTabChange = useCallback(
    (tab: EventTabType) => handleTabChange(tab, setActiveTab),
    [handleTabChange]
  );

  const tabs = useMemo(() => {
    const tabConfig = [
      {
        label: t('eventDetail.tabs.details', 'Details'),
        value: 'details' as EventTabType,
        icon: 'information-circle-outline' as keyof typeof Ionicons.glyphMap,
      },
      {
        label: t('eventDetail.tabs.commentary', 'Commentary'),
        value: 'commentary' as EventTabType,
        icon: 'mic-outline' as keyof typeof Ionicons.glyphMap,
        badge: commentaryCount,
      },
    ];

    if (participants.length > 0) {
      tabConfig.push({
        label: t('eventDetail.tabs.participants', 'Participants'),
        value: 'participants' as EventTabType,
        icon: 'people-outline' as keyof typeof Ionicons.glyphMap,
        badge: participants.length,
      });
    }

    if (leaderboard.length > 0) {
      tabConfig.push({
        label: t('eventDetail.tabs.leaderboard', 'Leaderboard'),
        value: 'leaderboard' as EventTabType,
        icon: 'trophy-outline' as keyof typeof Ionicons.glyphMap,
      });
    }

    return tabConfig;
  }, [t, participants.length, leaderboard.length, commentaryCount]);

  if (isLoading) {
    return <Loading fullScreen message={t('eventDetail.loading')} />;
  }

  if (error || !event) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('eventDetail.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
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

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('eventDetail.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShareModalVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="share-social-outline" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            {canEdit && (
              <>
                <TouchableOpacity
                  onPress={() => navigation.navigate('EventForm', { eventId: event.id })}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="create-outline" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                {canDelete && (
                  <TouchableOpacity
                    onPress={handleDeleteEvent}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={24} color={colors.error} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        }
      />

      {/* Collapsible Event Image + Title */}
      <Animated.View
        style={[
          styles.collapsibleHeader,
          { height: collapsibleHeight, opacity: collapsibleOpacity },
        ]}
      >
        <View style={[styles.imageContainer, { backgroundColor: colors.border }]}>
          {event.cover_image_url || event.post?.photos?.[0]?.url ? (
            <Image
              source={{
                uri:
                  fixStorageUrl(event.cover_image_url || event.post?.photos?.[0]?.url) || undefined,
              }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.primaryLight + '20' }]}>
              <Ionicons name={getSportIcon(event.sport_type?.name)} size={64} color={colors.primary} />
            </View>
          )}
          <View style={styles.badgeContainer}>
            <Badge label={event.status} variant={event.status} />
          </View>
        </View>

        <View style={[styles.titleSection, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {event.post?.title || t('eventDetail.untitled')}
          </Text>
          {event.is_registered && (
            <View style={styles.registeredTag}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={[styles.registeredText, { color: colors.primary }]}>
                {t('eventDetail.registered')}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      <EventTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

      {activeTab === 'details' && (
        <EventDetailsTabContent
          event={event}
          eventId={eventId}
          participants={participants}
          activities={activities}
          leaderboard={leaderboard}
          spotsText={spotsText}
          availableSpots={availableSpots}
          isFull={isFull}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          scrollViewRef={scrollViewRef}
          onScrollToBottom={scrollToBottom}
          fetchEvent={fetchEvent}
          onUserPress={handleUserPress}
          onActivityPress={handleActivityPress}
          onScroll={handleTabScroll}
        />
      )}

      {activeTab === 'commentary' && (
        <CommentaryTabContent
          event={event}
          onOpenSettings={canEdit ? handleOpenCommentarySettings : undefined}
        />
      )}

      {activeTab === 'participants' && participants.length > 0 && (
        <EventParticipantsTabContent
          participants={participants}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          onParticipantPress={isAuthenticated ? handleUserPress : undefined}
          onScroll={handleTabScroll}
        />
      )}

      {activeTab === 'leaderboard' && leaderboard.length > 0 && (
        <EventLeaderboardTabContent
          leaderboard={leaderboard}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          onUserPress={handleUserPress}
          isAuthenticated={isAuthenticated}
          onScroll={handleTabScroll}
        />
      )}

      {/* Bottom Action Button — hidden when keyboard is visible */}
      {!isKeyboardVisible && (
        <View
          style={[
            styles.bottomAction,
            {
              backgroundColor: colors.cardBackground,
              borderTopColor: colors.border,
              paddingBottom: spacing.md + insets.bottom,
            },
          ]}
        >
          {canStartActivity ? (
            <Button
              title={t('eventDetail.startActivity')}
              onPress={handleStartActivity}
              variant="primary"
              style={styles.actionButton}
            />
          ) : canUnregister ? (
            <Button
              title={t('eventDetail.cancelRegistration')}
              onPress={handleCancelRegistration}
              variant="outline"
              loading={isRegistering}
              style={styles.actionButton}
            />
          ) : canRegister ? (
            <Button
              title={
                isAuthenticated
                  ? t('eventDetail.registerForEvent')
                  : t('eventDetail.signInToRegister')
              }
              onPress={handleRegister}
              variant="primary"
              loading={isRegistering}
              style={styles.actionButton}
            />
          ) : (
            <View style={[styles.statusBanner, { backgroundColor: colors.border }]}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {getRegistrationClosedMessage()}
              </Text>
            </View>
          )}
        </View>
      )}

      <SocialShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        type="event"
        id={eventId}
        title={event?.post?.title}
        description={event?.post?.content}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  deleteButton: {
    marginLeft: spacing.xs,
  },
  collapsibleHeader: {
    overflow: 'hidden',
  },
  imageContainer: {
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
  },
  titleSection: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  registeredTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registeredText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  actionButton: {
    width: '100%',
  },
  statusBanner: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.md,
    flex: 1,
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
