import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { CommentSection } from './CommentSection';
import { CountdownTimer } from './CountdownTimer';
import { ParticipantAvatarsStack } from './ParticipantAvatarsStack';
import { LeaderboardEntryRow } from './EventLeaderboardTabContent';
import { useTheme } from '../hooks/useTheme';
import { useUnits } from '../hooks/useUnits';
import { useAuth } from '../hooks/useAuth';
import { spacing, fontSize } from '../theme';
import type { Event, EventRegistration, Activity, LeaderboardEntry, User } from '../types/api';
import type { ThemeColors } from '../theme/colors';

const getDifficultyColors = (colors: ThemeColors): Record<string, string> => ({
  beginner: colors.success,
  intermediate: colors.warning || '#f59e0b',
  advanced: colors.error,
  all_levels: colors.primary,
});

interface EventDetailsTabContentProps {
  event: Event;
  eventId: number;
  participants: EventRegistration[];
  activities: Activity[];
  leaderboard: LeaderboardEntry[];
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

export function EventDetailsTabContent({
  event,
  eventId,
  participants,
  activities,
  leaderboard,
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
}: EventDetailsTabContentProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistanceShort, formatDistance } = useUnits();
  const { isAuthenticated } = useAuth();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const difficultyColors = getDifficultyColors(colors);

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

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
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
});
