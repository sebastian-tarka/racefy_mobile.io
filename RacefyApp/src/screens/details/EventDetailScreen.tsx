import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Card, Button, Loading, Badge } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Event } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

const difficultyColors: Record<string, string> = {
  beginner: colors.success,
  intermediate: colors.warning || '#f59e0b',
  advanced: colors.error,
  all_levels: colors.primary,
};

export function EventDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { eventId } = route.params;
  const { isAuthenticated, user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getEvent(eventId);
      setEvent(data);
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('eventDetail.title')}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={colors.textMuted}
          />
          <Text style={styles.errorText}>{error || t('eventDetail.notFound')}</Text>
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
  const isOwnEvent = user && event.created_by === user.id;
  const canEdit = isOwnEvent && event.status === 'upcoming';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('eventDetail.title')}</Text>
        {canEdit ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('EventForm', { eventId: event.id })}
            style={styles.editButton}
          >
            <Ionicons name="create-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Event Image/Header */}
        <View style={styles.imageContainer}>
          {(event.cover_image || event.post?.photos?.[0]?.url) ? (
            <Image
              source={{ uri: event.cover_image || event.post?.photos?.[0]?.url }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name={getSportIcon()} size={64} color={colors.primary} />
            </View>
          )}
          <View style={styles.badgeContainer}>
            <Badge label={event.status} variant={event.status} />
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>
            {event.post?.title || t('eventDetail.untitled')}
          </Text>
          {event.is_registered && (
            <View style={styles.registeredTag}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.registeredText}>{t('eventDetail.registered')}</Text>
            </View>
          )}
        </View>

        {/* About */}
        {event.post?.content && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t('eventDetail.about')}</Text>
            <Text style={styles.description}>{event.post.content}</Text>
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
              <Text style={styles.infoLabel}>{t('eventDetail.dateTime')}</Text>
              <Text style={styles.infoValue}>
                {format(startDate, 'EEEE, MMMM d, yyyy')}
              </Text>
              <Text style={styles.infoSubvalue}>
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
              <Text style={styles.infoLabel}>{t('eventDetail.location')}</Text>
              <Text style={styles.infoValue}>{event.location_name}</Text>
            </View>
          </View>
        </Card>

        {/* Details Grid */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('eventDetail.details')}</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons
                name="fitness-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.detailLabel}>{t('eventDetail.sport')}</Text>
              <Text style={styles.detailValue}>
                {event.sport_type?.name || t('eventDetail.sport')}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons
                name="speedometer-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.detailLabel}>{t('eventDetail.difficulty')}</Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: difficultyColors[event.difficulty] },
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
              <Text style={styles.detailLabel}>{t('eventDetail.participants')}</Text>
              <Text style={styles.detailValue}>{spotsText}</Text>
            </View>
            {event.distance && (
              <View style={styles.detailItem}>
                <Ionicons
                  name="map-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.detailLabel}>{t('eventDetail.distance')}</Text>
                <Text style={styles.detailValue}>
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
                <Text style={styles.detailLabel}>{t('eventDetail.entryFee')}</Text>
                <Text style={styles.detailValue}>
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
                <Text style={styles.detailLabel}>{t('eventDetail.available')}</Text>
                <Text
                  style={[
                    styles.detailValue,
                    isFull && { color: colors.error },
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
            <Text style={styles.sectionTitle}>{t('eventDetail.registrationPeriod')}</Text>
            {event.registration_opens_at && (
              <View style={styles.registrationRow}>
                <Text style={styles.registrationLabel}>{t('eventDetail.opens')}:</Text>
                <Text style={styles.registrationValue}>
                  {format(
                    new Date(event.registration_opens_at),
                    'MMM d, yyyy h:mm a'
                  )}
                </Text>
              </View>
            )}
            {event.registration_closes_at && (
              <View style={styles.registrationRow}>
                <Text style={styles.registrationLabel}>{t('eventDetail.closes')}:</Text>
                <Text style={styles.registrationValue}>
                  {format(
                    new Date(event.registration_closes_at),
                    'MMM d, yyyy h:mm a'
                  )}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Spacer for button */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomAction}>
        {event.is_registered ? (
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
          <View style={styles.fullBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={styles.fullText}>{t('eventDetail.eventFull')}</Text>
          </View>
        ) : event.status !== 'upcoming' ? (
          <View style={styles.statusBanner}>
            <Text style={styles.statusText}>
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  placeholder: {
    width: 32,
  },
  editButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  imageContainer: {
    height: 200,
    backgroundColor: colors.border,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primaryLight + '20',
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
    backgroundColor: colors.cardBackground,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  registeredTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registeredText: {
    fontSize: fontSize.sm,
    color: colors.primary,
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
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
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
    color: colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  infoSubvalue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  registrationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  registrationLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  registrationValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardBackground,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    width: '100%',
  },
  fullBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.lg,
  },
  fullText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.error,
    marginLeft: spacing.sm,
  },
  statusBanner: {
    padding: spacing.md,
    backgroundColor: colors.border,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statusText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginVertical: spacing.lg,
    textAlign: 'center',
  },
});
