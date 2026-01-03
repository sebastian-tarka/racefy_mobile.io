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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Card, Button, Loading, Badge, ScreenHeader, Avatar, CommentSection } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { spacing, fontSize, borderRadius } from '../../theme';
import { fixStorageUrl } from '../../config/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Event, EventRegistration, User } from '../../types/api';
import type { ThemeColors } from '../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

const getDifficultyColors = (colors: ThemeColors): Record<string, string> => ({
  beginner: colors.success,
  intermediate: colors.warning || '#f59e0b',
  advanced: colors.error,
  all_levels: colors.primary,
});

export function EventDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const difficultyColors = useMemo(() => getDifficultyColors(colors), [colors]);
  const { eventId } = route.params;
  const { isAuthenticated, user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<EventRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const fetchParticipants = useCallback(async () => {
    try {
      const participantsData = await api.getEventParticipants(eventId);
      setParticipants(participantsData);
    } catch (err) {
      // Silently fail - participants are optional
    }
  }, [eventId]);

  const fetchEvent = useCallback(async () => {
    try {
      setError(null);
      const [eventData, participantsData] = await Promise.all([
        api.getEvent(eventId),
        api.getEventParticipants(eventId).catch(() => []),
      ]);
      setEvent(eventData);
      setParticipants(participantsData);
    } catch (err) {
      setError(t('eventDetail.failedToLoad'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchEvent();
  }, [fetchEvent]);

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
          ? {
              ...prev,
              is_registered: true,
              participants_count: prev.participants_count + 1,
            }
          : null
      );
      // Refresh participants list to show updated avatars
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

    Alert.alert(
      t('eventDetail.cancelRegistration'),
      t('eventDetail.cancelConfirm'),
      [
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
              // Refresh participants list to show updated avatars
              fetchParticipants();
              Alert.alert(t('common.success'), t('eventDetail.cancelSuccess'));
            } catch (err: any) {
              Alert.alert(
                t('common.error'),
                err.message || t('eventDetail.cancelFailed')
              );
            } finally {
              setIsRegistering(false);
            }
          },
        },
      ]
    );
  };

  const handleStartActivity = () => {
    if (!event) return;
    navigation.navigate('Main', {
      screen: 'Record',
      params: { preselectedEvent: event },
    });
  };

  const getSportIcon = (): keyof typeof Ionicons.glyphMap => {
    const sportName = event?.sport_type?.name?.toLowerCase() || '';
    if (sportName.includes('run')) return 'walk-outline';
    if (sportName.includes('cycling') || sportName.includes('bike'))
      return 'bicycle-outline';
    if (sportName.includes('swim')) return 'water-outline';
    if (sportName.includes('gym') || sportName.includes('fitness'))
      return 'barbell-outline';
    if (sportName.includes('yoga')) return 'body-outline';
    return 'fitness-outline';
  };

  if (isLoading) {
    return <Loading fullScreen message={t('eventDetail.loading')} />;
  }

  if (error || !event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader
          title={t('eventDetail.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={colors.textMuted}
          />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error || t('eventDetail.notFound')}</Text>
          <Button title={t('common.tryAgain')} onPress={fetchEvent} variant="primary" />
        </View>
      </SafeAreaView>
    );
  }

  const startDate = new Date(event.starts_at);
  const endDate = new Date(event.ends_at);
  const spotsText =
    event.max_participants !== null
      ? `${event.participants_count}/${event.max_participants}`
      : `${event.participants_count}`;
  const availableSpots =
    event.max_participants !== null
      ? event.max_participants - event.participants_count
      : null;
  const isFull = availableSpots !== null && availableSpots <= 0;
  const canRegister =
    event.status === 'upcoming' && !event.is_registered && !isFull;
  const canStartActivity = event.status === 'ongoing' && event.is_registered;
  const canEdit = event.is_owner ?? false;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('eventDetail.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={canEdit ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('EventForm', { eventId: event.id })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : undefined}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* Event Image/Header */}
        <View style={[styles.imageContainer, { backgroundColor: colors.border }]}>
          {(event.cover_image_url || event.post?.photos?.[0]?.url) ? (
            <Image
              source={{ uri: fixStorageUrl(event.cover_image_url || event.post?.photos?.[0]?.url) || undefined }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.primaryLight + '20' }]}>
              <Ionicons name={getSportIcon()} size={64} color={colors.primary} />
            </View>
          )}
          <View style={styles.badgeContainer}>
            <Badge label={event.status} variant={event.status} />
          </View>
        </View>

        {/* Title */}
        <View style={[styles.titleSection, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {event.post?.title || t('eventDetail.untitled')}
          </Text>
          {event.is_registered && (
            <View style={styles.registeredTag}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.registeredText, { color: colors.primary }]}>{t('eventDetail.registered')}</Text>
            </View>
          )}
        </View>

        {/* About */}
        {event.post?.content && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('eventDetail.about')}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>{event.post.content}</Text>
          </Card>
        )}

        {/* Date & Time */}
        <Card style={styles.section}>
          <View style={styles.infoRow}>
            <Ionicons
              name="calendar-outline"
              size={24}
              color={colors.primary}
            />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{t('eventDetail.dateTime')}</Text>
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
            <Ionicons
              name="location-outline"
              size={24}
              color={colors.primary}
            />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{t('eventDetail.location')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{event.location_name}</Text>
            </View>
          </View>
        </Card>

        {/* Details Grid */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('eventDetail.details')}</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons
                name="fitness-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{t('eventDetail.sport')}</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {event.sport_type?.name || t('eventDetail.sport')}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons
                name="speedometer-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{t('eventDetail.difficulty')}</Text>
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
              <Ionicons
                name="people-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{t('eventDetail.participants')}</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{spotsText}</Text>
            </View>
            {event.distance && (
              <View style={styles.detailItem}>
                <Ionicons
                  name="map-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{t('eventDetail.distance')}</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                  {(event.distance / 1000).toFixed(1)} km
                </Text>
              </View>
            )}
            {event.entry_fee !== null && (
              <View style={styles.detailItem}>
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{t('eventDetail.entryFee')}</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                  {event.entry_fee === 0 ? t('eventDetail.free') : `$${event.entry_fee}`}
                </Text>
              </View>
            )}
            {availableSpots !== null && (
              <View style={styles.detailItem}>
                <Ionicons
                  name="ticket-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{t('eventDetail.available')}</Text>
                <Text
                  style={[
                    styles.detailValue,
                    { color: isFull ? colors.error : colors.textPrimary },
                  ]}
                >
                  {isFull ? t('eventDetail.full') : t('eventDetail.spots', { count: availableSpots })}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Registration Info */}
        {(event.registration_opens_at || event.registration_closes_at) && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('eventDetail.registrationPeriod')}</Text>
            {event.registration_opens_at && (
              <View style={styles.registrationRow}>
                <Text style={[styles.registrationLabel, { color: colors.textSecondary }]}>{t('eventDetail.opens')}:</Text>
                <Text style={[styles.registrationValue, { color: colors.textPrimary }]}>
                  {format(
                    new Date(event.registration_opens_at),
                    'MMM d, yyyy h:mm a'
                  )}
                </Text>
              </View>
            )}
            {event.registration_closes_at && (
              <View style={styles.registrationRow}>
                <Text style={[styles.registrationLabel, { color: colors.textSecondary }]}>{t('eventDetail.closes')}:</Text>
                <Text style={[styles.registrationValue, { color: colors.textPrimary }]}>
                  {format(
                    new Date(event.registration_closes_at),
                    'MMM d, yyyy h:mm a'
                  )}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Participants */}
        {participants.length > 0 && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('eventDetail.participants')} ({participants.length})
            </Text>
            <View style={styles.participantsRow}>
              {participants.slice(0, 6).map((registration, index) => (
                <TouchableOpacity
                  key={`participant-${index}-${registration.id ?? 'no-id'}-${registration.user_id ?? 'no-user'}`}
                  style={[
                    styles.participantAvatar,
                    index > 0 && styles.participantAvatarOverlap,
                  ]}
                  onPress={() => {
                    if (registration.user?.username) {
                      navigation.navigate('UserProfile', { username: registration.user.username });
                    }
                  }}
                >
                  <Avatar
                    uri={registration.user?.avatar}
                    name={registration.user?.name || '?'}
                    size="md"
                  />
                </TouchableOpacity>
              ))}
              {participants.length > 6 && (
                <View style={[styles.participantAvatar, styles.participantAvatarOverlap, styles.moreParticipants, { backgroundColor: colors.border }]}>
                  <Text style={[styles.moreParticipantsText, { color: colors.textPrimary }]}>
                    +{participants.length - 6}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Comments Section */}
        <View style={styles.section}>
          <CommentSection
            commentableType="event"
            commentableId={eventId}
            onUserPress={(user: User) => navigation.navigate('UserProfile', { username: user.username })}
            onInputFocus={scrollToBottom}
          />
        </View>

          {/* Spacer for button */}
          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Button */}
      <View style={[styles.bottomAction, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        {canStartActivity ? (
          <Button
            title={t('eventDetail.startActivity')}
            onPress={handleStartActivity}
            variant="primary"
            style={styles.actionButton}
          />
        ) : event.is_registered ? (
          <Button
            title={t('eventDetail.cancelRegistration')}
            onPress={handleCancelRegistration}
            variant="outline"
            loading={isRegistering}
            style={styles.actionButton}
          />
        ) : canRegister ? (
          <Button
            title={isAuthenticated ? t('eventDetail.registerForEvent') : t('eventDetail.signInToRegister')}
            onPress={handleRegister}
            variant="primary"
            loading={isRegistering}
            style={styles.actionButton}
          />
        ) : isFull ? (
          <View style={[styles.fullBanner, { backgroundColor: colors.error + '10' }]}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={[styles.fullText, { color: colors.error }]}>{t('eventDetail.eventFull')}</Text>
          </View>
        ) : event.status !== 'upcoming' ? (
          <View style={[styles.statusBanner, { backgroundColor: colors.border }]}>
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              {event.status === 'completed' ? t('eventDetail.registrationClosed') : t('eventDetail.registrationNotAvailable')}
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
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
  fullBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  fullText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  statusBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statusText: {
    fontSize: fontSize.md,
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
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatar: {
    borderRadius: 20,
  },
  participantAvatarOverlap: {
    marginLeft: -spacing.sm,
  },
  moreParticipants: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreParticipantsText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
