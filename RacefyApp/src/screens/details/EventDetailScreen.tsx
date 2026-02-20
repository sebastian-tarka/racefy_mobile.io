import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Button,
  Loading,
  Badge,
  ScreenHeader,
  Avatar,
  CommentSection,
  CountdownTimer,
  EventTabs,
  CommentaryTabContent,
  SocialShareModal,
  ParticipantAvatarsStack,
  ScreenContainer,
} from '../../components';
import type { EventTabType } from '../../components/EventTabs';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { api } from '../../services/api';
import { emitRefresh, useRefreshOn } from '../../services/refreshEvents';
import { spacing, fontSize, borderRadius } from '../../theme';
import { fixStorageUrl } from '../../config/api';
import { getSportIcon } from '../../utils/sportIcon';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Event, EventRegistration, User, Activity, LeaderboardEntry } from '../../types/api';
import type { ThemeColors } from '../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

const COLLAPSE_THRESHOLD = 80;
const EXPAND_THRESHOLD = 20;
const COLLAPSIBLE_HEIGHT = 290; // image (200) + title section (~90)

const getDifficultyColors = (colors: ThemeColors): Record<string, string> => ({
  beginner: colors.success,
  intermediate: colors.warning || '#f59e0b',
  advanced: colors.error,
  all_levels: colors.primary,
});

// ---------------------------------------------------------------------------
// LeaderboardEntryRow — private reusable row used in both the details preview
// and the full leaderboard tab, removing JSX duplication within this screen.
// ---------------------------------------------------------------------------
interface LeaderboardEntryRowProps {
  entry: LeaderboardEntry;
  index: number;
  borderColor: string;
  onPress?: () => void;
  isAuthenticated: boolean;
}

function LeaderboardEntryRow({
  entry,
  index,
  borderColor,
  onPress,
  isAuthenticated,
}: LeaderboardEntryRowProps) {
  const { colors } = useTheme();
  const medalColor =
    index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : null;

  return (
    <TouchableOpacity
      key={`leaderboard-${entry.rank}-${entry.user.id}`}
      style={[styles.leaderboardItem, { borderBottomColor: borderColor }]}
      onPress={onPress}
      disabled={!isAuthenticated}
      activeOpacity={isAuthenticated ? 0.7 : 1}
    >
      <View style={styles.leaderboardRank}>
        {medalColor ? (
          <View style={[styles.medalBadge, { backgroundColor: medalColor + '20' }]}>
            <Ionicons name="trophy" size={14} color={medalColor} />
          </View>
        ) : (
          <Text style={[styles.rankNumber, { color: colors.textSecondary }]}>{entry.rank}</Text>
        )}
      </View>
      <Avatar uri={fixStorageUrl(entry.user.avatar)} name={entry.user.name} size="sm" />
      <View style={styles.leaderboardUserInfo}>
        <Text style={[styles.leaderboardUserName, { color: colors.textPrimary }]} numberOfLines={1}>
          {entry.user.name}
        </Text>
        <Text style={[styles.leaderboardUsername, { color: colors.textMuted }]}>
          @{entry.user.username}
        </Text>
      </View>
      <View style={styles.leaderboardPoints}>
        <Text style={[styles.leaderboardPointsValue, { color: colors.primary }]}>
          {entry.points.toLocaleString()}
        </Text>
        <Text style={[styles.leaderboardPointsLabel, { color: colors.textMuted }]}>pts</Text>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// DetailsTabContent — the main (first) tab
// ---------------------------------------------------------------------------
interface DetailsTabContentProps {
  event: Event;
  eventId: number;
  participants: EventRegistration[];
  activities: Activity[];
  leaderboard: LeaderboardEntry[];
  difficultyColors: Record<string, string>;
  spotsText: string;
  availableSpots: number | null;
  isFull: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  scrollViewRef: React.RefObject<ScrollView | null>;
  onScrollToBottom: () => void;
  fetchEvent: () => void;
  onUserPress?: (username: string) => void;
  onActivityPress: (activityId: number) => void;
  onScroll?: (event: any) => void;
}

function DetailsTabContent({
  event,
  eventId,
  participants,
  activities,
  leaderboard,
  difficultyColors,
  spotsText,
  availableSpots,
  isFull,
  isRefreshing,
  onRefresh,
  scrollViewRef,
  onScrollToBottom,
  fetchEvent,
  onUserPress,
  onActivityPress,
  onScroll,
}: DetailsTabContentProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistanceShort, formatDistance } = useUnits();
  const { isAuthenticated } = useAuth();
  const { bottom: bottomInset } = useSafeAreaInsets();

  const startDate = new Date(event.starts_at);
  const endDate = new Date(event.ends_at);

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'position' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* About */}
        {event.post?.content && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('eventDetail.about')}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {event.post.content}
            </Text>
          </Card>
        )}

        {/* Date & Time */}
        <Card style={styles.section}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                {t('eventDetail.dateTime')}
              </Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {format(startDate, 'EEEE, MMMM d, yyyy')}
              </Text>
              <Text style={[styles.infoSubvalue, { color: colors.textSecondary }]}>
                {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Location */}
        <Card style={styles.section}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={24} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                {t('eventDetail.location')}
              </Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {event.location_name}
              </Text>
            </View>
          </View>
        </Card>

        {/* Details Grid */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('eventDetail.details')}
          </Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="fitness-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                {t('eventDetail.sport')}
              </Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {event.sport_type?.name || t('eventDetail.sport')}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="speedometer-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                {t('eventDetail.difficulty')}
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: difficultyColors[event.difficulty] || colors.textPrimary },
                ]}
              >
                {t(`difficulty.${event.difficulty}`)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                {t('eventDetail.participants')}
              </Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{spotsText}</Text>
            </View>
            {event.distance && (
              <View style={styles.detailItem}>
                <Ionicons name="map-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                  {t('eventDetail.distance')}
                </Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                  {formatDistanceShort(event.distance)}
                </Text>
              </View>
            )}
            {event.entry_fee !== null && (
              <View style={styles.detailItem}>
                <Ionicons name="cash-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                  {t('eventDetail.entryFee')}
                </Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                  {event.entry_fee === 0 ? t('eventDetail.free') : `$${event.entry_fee}`}
                </Text>
              </View>
            )}
            {availableSpots !== null && (
              <View style={styles.detailItem}>
                <Ionicons name="ticket-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                  {t('eventDetail.available')}
                </Text>
                <Text
                  style={[
                    styles.detailValue,
                    { color: isFull ? colors.error : colors.textPrimary },
                  ]}
                >
                  {isFull
                    ? t('eventDetail.full')
                    : t('eventDetail.spots', { count: availableSpots })}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Registration Info */}
        {(event.registration_opens_at || event.registration_closes_at) && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('eventDetail.registrationPeriod')}
            </Text>

            {event.registration_opens_at && (
              <View style={styles.countdownWrapper}>
                <CountdownTimer
                  targetDate={event.registration_opens_at}
                  title={t('eventDetail.registrationOpensIn')}
                  onComplete={fetchEvent}
                />
              </View>
            )}

            {event.registration_opens_at && (
              <View style={styles.registrationRow}>
                <Text style={[styles.registrationLabel, { color: colors.textSecondary }]}>
                  {t('eventDetail.opens')}:
                </Text>
                <Text style={[styles.registrationValue, { color: colors.textPrimary }]}>
                  {format(new Date(event.registration_opens_at), 'MMM d, yyyy h:mm a')}
                </Text>
              </View>
            )}
            {event.registration_closes_at && (
              <View style={styles.registrationRow}>
                <Text style={[styles.registrationLabel, { color: colors.textSecondary }]}>
                  {t('eventDetail.closes')}:
                </Text>
                <Text style={[styles.registrationValue, { color: colors.textPrimary }]}>
                  {format(new Date(event.registration_closes_at), 'MMM d, yyyy h:mm a')}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Participants preview */}
        {participants.length > 0 && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('eventDetail.participants')} ({participants.length})
            </Text>
            <ParticipantAvatarsStack
              participants={participants}
              maxVisible={6}
              onParticipantPress={isAuthenticated ? onUserPress : undefined}
            />
          </Card>
        )}

        {/* Activities */}
        {activities.length > 0 && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('eventDetail.activities')} ({activities.length})
            </Text>
            {activities.slice(0, 5).map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={[styles.activityItem, { borderBottomColor: colors.border }]}
                onPress={() => onActivityPress(activity.id)}
              >
                <View style={styles.activityLeft}>
                  <Avatar uri={activity.user?.avatar} name={activity.user?.name || '?'} size="sm" />
                  <View style={styles.activityInfo}>
                    <Text style={[styles.activityUser, { color: colors.textPrimary }]}>
                      {activity.user?.name}
                    </Text>
                    <Text
                      style={[styles.activityTitle, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {activity.title}
                    </Text>
                  </View>
                </View>
                <View style={styles.activityStats}>
                  <Text style={[styles.activityDistance, { color: colors.primary }]}>
                    {formatDistance(activity.distance)}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
            {activities.length > 5 && (
              <Text style={[styles.moreActivitiesText, { color: colors.textMuted }]}>
                {t('eventDetail.moreActivities', { count: activities.length - 5 })}
              </Text>
            )}
          </Card>
        )}

        {/* Leaderboard preview */}
        {leaderboard.length > 0 && (
          <Card style={styles.section}>
            <View style={styles.leaderboardHeader}>
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}
              >
                {t('eventDetail.leaderboard')}
              </Text>
              <Ionicons name="trophy" size={20} color="#FFD700" />
            </View>
            {leaderboard.map((entry, index) => (
              <LeaderboardEntryRow
                key={`preview-${entry.rank}-${entry.user.id}`}
                entry={entry}
                index={index}
                borderColor={colors.border}
                isAuthenticated={isAuthenticated}
                onPress={
                  isAuthenticated && entry.user.username
                    ? () => onUserPress?.(entry.user.username)
                    : undefined
                }
              />
            ))}
          </Card>
        )}

        {/* Comments */}
        <View style={styles.section}>
          <CommentSection
            commentableType="event"
            commentableId={eventId}
            onUserPress={
              isAuthenticated
                ? (user: User) => onUserPress?.(user.username)
                : undefined
            }
            onInputFocus={onScrollToBottom}
          />
        </View>

        <View style={{ height: 100 + bottomInset }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// ParticipantsTabContent — full participants list tab
// ---------------------------------------------------------------------------
interface ParticipantsTabContentProps {
  participants: EventRegistration[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onParticipantPress?: (username: string) => void;
  onScroll?: (event: any) => void;
}

function ParticipantsTabContent({
  participants,
  isRefreshing,
  onRefresh,
  onParticipantPress,
  onScroll,
}: ParticipantsTabContentProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('eventDetail.participants')} ({participants.length})
        </Text>
        {participants.map((registration, index) => (
          <TouchableOpacity
            key={`participant-detail-${index}-${registration.id ?? 'no-id'}-${registration.user_id ?? 'no-user'}`}
            style={[styles.participantRow, { borderBottomColor: colors.border }]}
            onPress={() => {
              if (registration.user?.username) {
                onParticipantPress?.(registration.user.username);
              }
            }}
            disabled={!onParticipantPress}
            activeOpacity={onParticipantPress ? 0.7 : 1}
          >
            <Avatar
              uri={registration.user?.avatar}
              name={registration.user?.name || '?'}
              size="md"
            />
            <View style={styles.participantInfo}>
              <Text style={[styles.participantName, { color: colors.textPrimary }]}>
                {registration.user?.name}
              </Text>
              {registration.user?.username && (
                <Text style={[styles.participantUsername, { color: colors.textMuted }]}>
                  @{registration.user.username}
                </Text>
              )}
            </View>
            <View style={styles.participantMeta}>
              <Text style={[styles.registrationNumber, { color: colors.textSecondary }]}>
                #{registration.registration_number}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </Card>
      <View style={{ height: 100 + bottomInset }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// LeaderboardTabContent — full leaderboard tab
// ---------------------------------------------------------------------------
interface LeaderboardTabContentProps {
  leaderboard: LeaderboardEntry[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onUserPress?: (username: string) => void;
  isAuthenticated: boolean;
  onScroll?: (event: any) => void;
}

function LeaderboardTabContent({
  leaderboard,
  isRefreshing,
  onRefresh,
  onUserPress,
  isAuthenticated,
  onScroll,
}: LeaderboardTabContentProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <Card style={styles.section}>
        <View style={styles.leaderboardHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
            {t('eventDetail.leaderboard')}
          </Text>
          <Ionicons name="trophy" size={20} color="#FFD700" />
        </View>
        {leaderboard.map((entry, index) => (
          <LeaderboardEntryRow
            key={`tab-${entry.rank}-${entry.user.id}`}
            entry={entry}
            index={index}
            borderColor={colors.border}
            isAuthenticated={isAuthenticated}
            onPress={
              isAuthenticated && entry.user.username
                ? () => onUserPress?.(entry.user.username)
                : undefined
            }
          />
        ))}
      </Card>
      <View style={{ height: 100 + bottomInset }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// EventDetailScreen — main screen component
// ---------------------------------------------------------------------------
export function EventDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const difficultyColors = useMemo(() => getDifficultyColors(colors), [colors]);
  const { eventId } = route.params;
  const { isAuthenticated, user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const headerAnim = useRef(new Animated.Value(1)).current;
  const isHeaderCollapsed = useRef(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<EventRegistration[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EventTabType>('details');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [commentaryCount, setCommentaryCount] = useState(0);

  // Keyboard listeners
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardWillShow', () =>
      setIsKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener('keyboardWillHide', () =>
      setIsKeyboardVisible(false)
    );
    const showSubscriptionAndroid = Keyboard.addListener('keyboardDidShow', () =>
      setIsKeyboardVisible(true)
    );
    const hideSubscriptionAndroid = Keyboard.addListener('keyboardDidHide', () =>
      setIsKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      showSubscriptionAndroid.remove();
      hideSubscriptionAndroid.remove();
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    const delay = Platform.OS === 'ios' ? 300 : 150;
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, delay);
  }, []);

  const fetchParticipants = useCallback(async () => {
    try {
      const participantsData = await api.getEventParticipants(eventId);
      setParticipants(participantsData);
    } catch {
      // Silently fail — participants are optional
    }
  }, [eventId]);

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

  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', { screen: 'Login' });
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
      fetchParticipants();
      Alert.alert(t('common.success'), t('eventDetail.registrationSuccess'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('eventDetail.registrationFailed'));
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
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
            fetchParticipants();
            Alert.alert(t('common.success'), t('eventDetail.cancelSuccess'));
          } catch (err: any) {
            Alert.alert(t('common.error'), err.message || t('eventDetail.cancelFailed'));
          } finally {
            setIsRegistering(false);
          }
        },
      },
    ]);
  };

  const handleStartActivity = () => {
    if (!event) return;
    navigation.navigate('Main', { screen: 'Record', params: { preselectedEvent: event } });
  };

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
            navigation.goBack();
          } catch {
            Alert.alert(t('common.error'), t('eventDetail.deleteEventFailed'));
          }
        },
      },
    ]);
  }, [event, navigation, t]);

  const handleOpenCommentarySettings = useCallback(() => {
    if (!event) return;
    navigation.navigate('EventCommentarySettings', { eventId: event.id });
  }, [event, navigation]);

  const handleUserPress = useCallback(
    (username: string) => {
      if (isAuthenticated) {
        navigation.navigate('UserProfile', { username });
      }
    },
    [isAuthenticated, navigation]
  );

  const handleTabScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const y = event.nativeEvent.contentOffset.y;
      // scrollable = how many px of content extend beyond the current viewport
      const scrollable =
        event.nativeEvent.contentSize.height - event.nativeEvent.layoutMeasurement.height;

      // Only collapse when there's enough content that after collapsing (viewport grows by
      // COLLAPSIBLE_HEIGHT) the current scroll position Y still fits within the new maxScroll.
      // Math: new_max = scrollable - COLLAPSIBLE_HEIGHT; no jump if Y <= new_max
      // At Y = COLLAPSE_THRESHOLD this holds when: scrollable > COLLAPSIBLE_HEIGHT + COLLAPSE_THRESHOLD
      if (
        y > COLLAPSE_THRESHOLD &&
        scrollable > COLLAPSIBLE_HEIGHT + COLLAPSE_THRESHOLD &&
        !isHeaderCollapsed.current
      ) {
        isHeaderCollapsed.current = true;
        Animated.timing(headerAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }).start();
      } else if (y < EXPAND_THRESHOLD && isHeaderCollapsed.current) {
        isHeaderCollapsed.current = false;
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
    },
    [headerAnim]
  );

  const handleTabChange = useCallback(
    (tab: EventTabType) => {
      setActiveTab(tab);
      isHeaderCollapsed.current = false;
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    },
    [headerAnim]
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

  const startDate = new Date(event.starts_at);
  const spotsText =
    event.max_participants !== null
      ? `${event.participants_count}/${event.max_participants}`
      : `${event.participants_count}`;
  const availableSpots =
    event.max_participants !== null ? event.max_participants - event.participants_count : null;
  const isFull = availableSpots !== null && availableSpots <= 0;
  const canModifyStatus = event.status === 'upcoming' || event.status === 'cancelled';

  // Trust API's registration eligibility (single source of truth)
  const eligibility = event.registration_eligibility || {
    can_register: event.is_registration_open ?? false,
    reason: null,
    opens_at: event.registration_opens_at,
    closes_at: event.registration_closes_at,
  };

  const canRegister = eligibility.can_register && !event.is_registered;
  const canUnregister = canModifyStatus && event.is_registered;
  const canStartActivity = event.status === 'ongoing' && event.is_registered;
  const canEdit = event.is_owner ?? false;
  const canDelete = canEdit && canModifyStatus;

  const getRegistrationClosedMessage = (): string => {
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
  };

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

      {/* Collapsible Event Image + Title — collapses on scroll */}
      <Animated.View
        style={[
          styles.collapsibleHeader,
          {
            height: headerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, COLLAPSIBLE_HEIGHT],
            }),
            opacity: headerAnim.interpolate({
              inputRange: [0, 0.6],
              outputRange: [0, 1],
            }),
          },
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

      <EventTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === 'details' && (
        <DetailsTabContent
          event={event}
          eventId={eventId}
          participants={participants}
          activities={activities}
          leaderboard={leaderboard}
          difficultyColors={difficultyColors}
          spotsText={spotsText}
          availableSpots={availableSpots}
          isFull={isFull}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          scrollViewRef={scrollViewRef}
          onScrollToBottom={scrollToBottom}
          fetchEvent={fetchEvent}
          onUserPress={handleUserPress}
          onActivityPress={(id) => navigation.navigate('ActivityDetail', { activityId: id })}
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
        <ParticipantsTabContent
          participants={participants}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          onParticipantPress={isAuthenticated ? handleUserPress : undefined}
          onScroll={handleTabScroll}
        />
      )}

      {activeTab === 'leaderboard' && leaderboard.length > 0 && (
        <LeaderboardTabContent
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
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  deleteButton: {
    marginLeft: spacing.xs,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
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
  section: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  infoSubvalue: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    width: '50%',
    paddingVertical: spacing.sm,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  registrationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  registrationLabel: {
    fontSize: fontSize.sm,
  },
  registrationValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  countdownWrapper: {
    marginBottom: spacing.md,
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
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  activityUser: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  activityTitle: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  activityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activityDistance: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  moreActivitiesText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingTop: spacing.sm,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  leaderboardRank: {
    width: 28,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  medalBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  leaderboardUserInfo: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  leaderboardUserName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  leaderboardUsername: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  leaderboardPoints: {
    alignItems: 'flex-end',
  },
  leaderboardPointsValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  leaderboardPointsLabel: {
    fontSize: fontSize.xs,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  participantInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  participantName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  participantUsername: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  participantMeta: {
    alignItems: 'flex-end',
  },
  registrationNumber: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});