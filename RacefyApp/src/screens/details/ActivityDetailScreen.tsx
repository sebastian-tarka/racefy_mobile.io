import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  ActivityLiveMessages,
  Avatar,
  BottomSheet,
  type BottomSheetOption,
  Card,
  CommentSection,
  EffortBreakdownCard,
  ElevationChart,
  HeartRateChart,
  InteractionButton,
  KeyboardAwareScreenLayout,
  Loading,
  MentionText,
  PaceChart,
  PremiumTeaser,
  ScreenContainer,
  ScreenHeader,
  ErrorState,
} from '../../components';
import {
  hasStrengthSession,
  StrengthRhythm,
  StrengthSessionCards,
} from '../../components/strength';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { emitRefresh, useRefreshOn } from '../../services/refreshEvents';
import { useTheme } from '../../hooks/useTheme';
import { useSubscription } from '../../hooks/useSubscription';
import {
  qualifiesForEffortAnalysis,
  useActivityEffortAnalysis,
} from '../../hooks/useActivityEffortAnalysis';
import { useLiveMessageArchive } from '../../hooks/useLiveMessageArchive';
import { ActivityDetailMap } from './activity/ActivityDetailMap';
import { ActivityDetailedStats, ActivityMainStats } from './activity/ActivityStats';
import { ActivityPhotoGallery } from './activity/ActivityPhotoGallery';
import { ActivityTechnicalInfo } from './activity/ActivityTechnicalInfo';
import { borderRadius, fontSize, spacing } from '../../theme';
import { getSportIcon } from '../../utils/sportIcon';
import { exportGpxAndShare } from '../../utils/gpxExport';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Activity, GpsTrack, SingleActivityStats, User } from '../../types/api';
import { getErrorMessage, isApiError } from '../../utils/errors';
import { formatDate, formatIntlDate } from '../../utils/dateFormat';

type Props = NativeStackScreenProps<RootStackParamList, 'ActivityDetail'>;

export function ActivityDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { canUse, tier } = useSubscription();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isActionsSheetVisible, setIsActionsSheetVisible] = useState(false);
  const { activityId } = route.params;
  const scrollViewRef = useRef<ScrollView>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [gpsTrack, setGpsTrack] = useState<GpsTrack | null>(null);
  const [activityStats, setActivityStats] = useState<SingleActivityStats | null>(null);

  // Effort breakdown. Not gated by tier and identical for the owner and for
  // anyone else who can see the activity - visibility follows the activity
  // itself. The pre-check mirrors the backend rule so activities that could
  // only answer 204 never cost a request.
  const { analysis: effortAnalysis, isPending: isEffortAnalysisPending } =
    useActivityEffortAnalysis(activity?.id, {
      enabled: !!activity && qualifiesForEffortAnalysis(activity),
    });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  // Cheers pinned on the route (owner's finished broadcast). On by default —
  // seeing where they landed is the point; the toggle declutters a busy map.
  const [showCheerPins, setShowCheerPins] = useState(true);
  const [selectedCheerId, setSelectedCheerId] = useState<number | null>(null);
  const mapHeightAnim = useRef(new Animated.Value(250)).current;
  // One fetch shared by the card below and the pins on the map.
  const liveArchive = useLiveMessageArchive(activity);
  const cheerPins = showCheerPins ? liveArchive.pins : [];

  // Null for a viewer who is allowed to see the start and finish — there is
  // simply nothing to tell them.
  const gpsPrivacyLabel = !activity
    ? null
    : activity.is_owner
      ? activity.show_start_finish_points
        ? t('activityDetail.gpsPrivacyVisible')
        : t('activityDetail.gpsPrivacyHidden')
      : !activity.can_view_start_finish
        ? t('activityDetail.gpsPrivacyViewerHidden')
        : null;

  const scrollToComments = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);
  const fetchActivity = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getActivity(activityId);
      setActivity(data);
      setIsLiked(data.is_liked || false);
      setLikesCount(data.likes_count || 0);

      // Fetch GPS track if available
      if (data.has_gps_track) {
        try {
          const track = await api.getActivityTrack(activityId);
          logger.debug('gps', 'GPS Track loaded', {
            hasTrack: !!track,
            pointsCount: track?.points_count,
            hasRouteMapUrl: !!track?.route_map_url,
            hasRouteSvg: !!track?.route_svg,
          });
          setGpsTrack(track);

          // Fetch activity stats for charts (includes splits) — only for premium users
          if (!canUse('advanced_stats')) {
            logger.debug('gps', 'Skipping activity analysis — advanced_stats not available');
          } else
            try {
              const stats = await api.getActivityAnalysis(activityId);
              setActivityStats(stats);
              logger.debug('gps', 'Activity stats loaded', {
                hasSplits: !!stats.splits,
                splitsCount: stats.splits?.total_splits,
                hasData: stats.has_data,
              });
            } catch (statsError) {
              logger.debug('gps', 'Failed to load activity stats', { error: statsError });
            }
        } catch (trackError) {
          logger.debug('gps', 'Failed to load GPS track', { error: trackError });
        }
      } else {
        logger.debug('gps', 'Activity has no GPS track');
      }
    } catch {
      setError(t('activityDetail.failedToLoad'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activityId, t]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchActivity();
  }, [fetchActivity]);

  useRefreshOn('activities', fetchActivity);

  const handleDelete = useCallback(
    async (force: boolean = false) => {
      try {
        await api.deleteActivity(activityId, force);
        // Navigate back first to unmount this screen and cleanup listeners
        navigation.goBack();
        // Then emit refresh to update other screens (feed, profile, etc.)
        emitRefresh('activities');
      } catch (error) {
        // Check if activity is linked to training plan (422 error)
        if (isApiError(error) && error.training_week_id) {
          Alert.alert(
            t('activityDetail.linkedToTrainingPlan'),
            t('activityDetail.linkedToTrainingPlanMessage'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('activityDetail.forceDelete'),
                style: 'destructive',
                onPress: () => handleDelete(true),
              },
            ],
          );
        } else {
          Alert.alert(
            t('common.error'),
            getErrorMessage(error) || t('activityDetail.deleteFailed'),
          );
        }
      }
    },
    [activityId, navigation, t],
  );

  const confirmDelete = useCallback(() => {
    Alert.alert(t('activityDetail.deleteActivity'), t('activityDetail.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => handleDelete(false),
      },
    ]);
  }, [handleDelete, t]);

  const handleLikeChange = useCallback((active: boolean, count: number) => {
    setIsLiked(active);
    setLikesCount(count);
  }, []);

  const handleGenerateAiReport = useCallback(async () => {
    if (isGeneratingReport) return;
    if (tier === 'free') {
      navigation.navigate('Paywall', { feature: 'activity_analysis_reports_monthly' });
      return;
    }
    setIsGeneratingReport(true);
    try {
      const response = await api.generateActivityReport({ activity_ids: [activityId] });
      navigation.navigate('AiActivityReportDetail', { reportId: response.data.id });
    } catch (error) {
      if (isApiError(error) && error.status === 403 && error.upgrade_required) {
        Alert.alert(
          t('insights.aiReports.monthlyLimitReached'),
          t('insights.aiReports.monthlyLimitReachedHint'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('insights.locked.upgrade'),
              onPress: () =>
                navigation.navigate('Paywall', { feature: 'activity_analysis_reports_monthly' }),
            },
          ],
        );
      } else {
        Alert.alert('', getErrorMessage(error) || t('insights.aiReports.errorWaiting'));
      }
    } finally {
      setIsGeneratingReport(false);
    }
  }, [isGeneratingReport, tier, activityId, navigation, t]);

  const [isExportingGpx, setIsExportingGpx] = useState(false);
  const handleExportGpx = useCallback(async () => {
    if (!activity || isExportingGpx) return;
    setIsExportingGpx(true);
    try {
      const response = await api.getActivityTrackPoints(activityId);
      const points = (response.data || []).map((p) => ({
        lat: p.lat,
        lng: p.lng,
        ele: p.elevation,
        time: p.timestamp,
        speed: p.speed,
      }));
      if (points.length === 0) {
        Alert.alert('', t('unsynced.exportEmpty'));
        return;
      }
      const ok = await exportGpxAndShare({
        activityId,
        name: activity.title,
        startedAt: activity.started_at,
        sportType: activity.sport_type?.name,
        points,
      });
      if (!ok) {
        Alert.alert('', t('unsynced.exportFailedBody'));
      }
    } catch (err) {
      logger.error('activity', 'GPX export from detail failed', { activityId, error: err });
      Alert.alert('', getErrorMessage(err) || t('unsynced.exportFailedBody'));
    } finally {
      setIsExportingGpx(false);
    }
  }, [activity, activityId, isExportingGpx, t]);

  const toggleMapExpand = useCallback(() => {
    const newExpandedState = !isMapExpanded;
    setIsMapExpanded(newExpandedState);

    // Scroll to top when expanding for better UX
    if (newExpandedState) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }

    Animated.spring(mapHeightAnim, {
      toValue: newExpandedState ? 500 : 250,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [isMapExpanded, mapHeightAnim]);

  if (isLoading) {
    return <Loading fullScreen message={t('activityDetail.loading')} />;
  }

  if (error || !activity) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('activityDetail.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <ErrorState message={error || t('activityDetail.notFound')} onRetry={fetchActivity} />
      </ScreenContainer>
    );
  }

  const isOwner = activity?.is_owner ?? false;
  // Strength activity logged from a session: its own metrics, the rhythm strip
  // where the map would be, the set-by-set cards — and no text description
  // while it is the generated sets list (`description_is_auto`).
  const strength = hasStrengthSession(activity.strength_session) ? activity.strength_session : null;
  const hasMap =
    activity.has_gps_track &&
    !!(
      gpsTrack?.route_preview_url ||
      gpsTrack?.route_map_url ||
      gpsTrack?.route_svg ||
      gpsTrack?.track_data
    );

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('activityDetail.title')}
        showBack
        onBack={() => {
          logger.debug('navigation', 'Activity detail back pressed');
          navigation.goBack();
        }}
        rightAction={
          isOwner ? (
            <TouchableOpacity
              onPress={() => setIsActionsSheetVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={t('common.options')}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <CommentSection
        commentableType="post"
        commentableId={activity.post_id!}
        onUserPress={(user: User) =>
          navigation.navigate('UserProfile', { username: user.username })
        }
        onInputFocus={scrollToComments}
        renderLayout={({ header, commentList, commentInput, refreshComments }) => (
          <KeyboardAwareScreenLayout
            scrollViewRef={scrollViewRef}
            bottomContent={commentInput}
            refreshing={isRefreshing}
            onRefresh={() => {
              onRefresh();
              refreshComments();
            }}
            scrollViewProps={{ scrollEnabled: !isMapExpanded }}
          >
            {/* Map Section */}
            {activity.has_gps_track &&
              (gpsTrack?.route_preview_url ||
                gpsTrack?.route_map_url ||
                gpsTrack?.route_svg ||
                gpsTrack?.track_data) && (
                <ActivityDetailMap
                  activity={activity}
                  gpsTrack={gpsTrack!}
                  mapHeightAnim={mapHeightAnim}
                  isMapExpanded={isMapExpanded}
                  onToggleExpand={toggleMapExpand}
                  gpsPrivacyLabel={gpsPrivacyLabel}
                  cheerPins={cheerPins}
                  hasCheers={liveArchive.pins.length > 0}
                  showCheerPins={showCheerPins}
                  onToggleCheerPins={() => {
                    setShowCheerPins(!showCheerPins);
                    setSelectedCheerId(null);
                  }}
                  selectedCheerId={selectedCheerId}
                  onSelectCheer={setSelectedCheerId}
                />
              )}

            {/* Strength: the workout's rhythm where a run shows its map */}
            {strength && !hasMap && <StrengthRhythm session={strength} />}

            {/* Header Section: Title + User Info Combined */}
            <View style={[styles.headerSection, { backgroundColor: colors.cardBackground }]}>
              {/* User Info */}
              {activity.user && (
                <TouchableOpacity
                  style={styles.userRow}
                  onPress={() =>
                    navigation.navigate('UserProfile', { username: activity.user!.username })
                  }
                >
                  <Avatar uri={activity.user.avatar} name={activity.user.name} size="md" />
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.textPrimary }]}>
                      {activity.user.name}
                    </Text>
                    <Text style={[styles.activityDate, { color: colors.textMuted }]}>
                      {`${formatIntlDate(activity.started_at, { weekday: 'long', day: 'numeric', month: 'long' })} · ${formatDate(activity.started_at, 'p')}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Title and Sport */}
              <View style={styles.titleRow}>
                <Ionicons
                  name={getSportIcon(activity?.sport_type?.name)}
                  size={24}
                  color={colors.primary}
                  style={styles.sportIcon}
                />
                <View style={styles.titleContent}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {activity.title}
                  </Text>
                  <View style={styles.sportTypeRow}>
                    <Text style={[styles.sportType, { color: colors.textSecondary }]}>
                      {activity.sport_type?.name || t('activityDetail.activity')}
                    </Text>
                    {activity.training_week_id && (
                      <View
                        style={[
                          styles.trainingBadge,
                          { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                        ]}
                      >
                        <Ionicons name="school-outline" size={14} color={colors.primary} />
                        <Text style={[styles.trainingBadgeText, { color: colors.primary }]}>
                          {t('activityDetail.trainingPlan')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Location */}
              {activity.location?.location_name && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.locationText, { color: colors.textMuted }]}>
                    {activity.location.location_name}
                  </Text>
                </View>
              )}
            </View>

            {/* Engagement Section - Moved up for better UX */}
            <Card style={styles.engagementCard}>
              <View style={styles.engagementRow}>
                <InteractionButton
                  variant="like"
                  targetType="activity"
                  targetId={activity.id}
                  count={likesCount}
                  isActive={isLiked}
                  disabled={isOwner}
                  layout="vertical"
                  iconSize={28}
                  label={t('engagement.likes')}
                  countStyle={styles.engagementCount}
                  onChange={handleLikeChange}
                  containerStyle={styles.engagementItem}
                />

                <InteractionButton
                  variant="comment"
                  targetType="activity"
                  targetId={activity.id}
                  count={activity.comments_count || 0}
                  layout="vertical"
                  iconSize={28}
                  label={t('engagement.comments')}
                  countStyle={styles.engagementCount}
                  onPress={scrollToComments}
                  containerStyle={styles.engagementItem}
                />

                <InteractionButton
                  variant="boost"
                  targetType="activity"
                  targetId={activity.id}
                  count={activity.boosts_count || 0}
                  isActive={activity.is_boosted || false}
                  disabled={isOwner}
                  layout="vertical"
                  iconSize={28}
                  label={t('engagement.boosts')}
                  countStyle={styles.engagementCount}
                  containerStyle={styles.engagementItem}
                />

                {/* Share */}
                <TouchableOpacity
                  style={styles.engagementItem}
                  onPress={() =>
                    navigation.navigate('ActivityShare', {
                      activityId,
                      hasGpsTrack: activity.has_gps_track,
                      photos: activity.photos,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-social-outline" size={28} color={colors.textMuted} />
                  <Text style={[styles.engagementLabel, { color: colors.textMuted }]}>
                    {t('common.share')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Main Stats - Key Metrics First */}
            <ActivityMainStats activity={activity} strength={strength} />

            {strength && <StrengthSessionCards session={strength} cardStyle={styles.section} />}

            {/* Description - Story comes before technical details */}
            {activity.description && !strength?.description_is_auto && (
              <Card style={styles.section}>
                <MentionText
                  text={activity.description}
                  mentions={activity.mentions}
                  style={[styles.description, { color: colors.textSecondary }]}
                />
              </Card>
            )}

            {/* Secondary Stats - Detailed Metrics */}
            <ActivityDetailedStats activity={activity} />

            {/* Effort breakdown - phases of the recorded effort. Sits above the
                performance charts because it reads the whole session, while
                they read per-kilometre splits. */}
            <EffortBreakdownCard
              analysis={effortAnalysis}
              isPending={isEffortAnalysisPending}
              style={styles.section}
            />

            {/* Charts Section - Performance Analysis */}
            {canUse('advanced_stats') ? (
              activityStats?.splits &&
              activityStats.splits.splits.length > 0 && (
                <Card style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    {t('activityDetail.performanceAnalysis')}
                  </Text>
                  <PaceChart
                    splits={activityStats.splits.splits}
                    title={t('activityDetail.pacePerKm')}
                  />
                  {activityStats.has_data.elevation && (
                    <ElevationChart
                      splits={activityStats.splits.splits}
                      title={t('activityDetail.elevationPerKm')}
                    />
                  )}
                  {activityStats.has_data.heart_rate && (
                    <HeartRateChart
                      splits={activityStats.splits.splits}
                      title={t('activityDetail.heartRatePerKm')}
                    />
                  )}
                </Card>
              )
            ) : activity.has_gps_track ? (
              <PremiumTeaser feature="advanced_stats" style={styles.section} />
            ) : null}

            {activity.photos && activity.photos.length > 0 && (
              <ActivityPhotoGallery photos={activity.photos} />
            )}

            {/* Activity Info - Technical Details */}
            <ActivityTechnicalInfo activity={activity} gpsTrack={gpsTrack} />

            {/* Messages the athlete received while broadcasting. Renders
                nothing unless this is their own, once-live activity that
                actually collected some. */}
            <ActivityLiveMessages
              activity={activity}
              archive={liveArchive}
              selectedMessageId={selectedCheerId}
              onSelectMessage={(message) => {
                // Focus the pin: make sure pins are on, select it, bring the map into view.
                setShowCheerPins(true);
                setSelectedCheerId(message.id);
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
              }}
              onUserPress={(user: User) =>
                navigation.navigate('UserProfile', { username: user.username })
              }
            />

            {/* Comments Section */}
            <View style={styles.commentsSection}>
              {header}
              {commentList}
            </View>
          </KeyboardAwareScreenLayout>
        )}
      />

      <BottomSheet
        visible={isActionsSheetVisible}
        onClose={() => setIsActionsSheetVisible(false)}
        title={t('activityDetail.actions')}
        options={(() => {
          const opts: BottomSheetOption[] = [];
          if (activity.status === 'completed') {
            opts.push({
              id: 'generate-report',
              icon: 'sparkles-outline',
              title: t('insights.aiReports.generateForActivity'),
              onPress: handleGenerateAiReport,
              color: colors.primary,
            });
          }
          opts.push({
            id: 'edit',
            icon: 'create-outline',
            title: t('common.edit'),
            onPress: () => navigation.navigate('ActivityForm', { activityId }),
          });
          opts.push({
            id: 'share',
            icon: 'share-outline',
            title: t('common.share'),
            onPress: () =>
              navigation.navigate('ActivityShare', {
                activityId,
                hasGpsTrack: activity.has_gps_track,
                photos: activity.photos,
              }),
          });
          if (activity.has_gps_track) {
            opts.push({
              id: 'export-gpx',
              icon: 'download-outline',
              title: t('unsynced.exportGpx'),
              onPress: handleExportGpx,
            });
          }
          opts.push({
            id: 'delete',
            icon: 'trash-outline',
            title: t('common.delete'),
            onPress: confirmDelete,
            color: colors.error,
          });
          return opts;
        })()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  activityDate: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  sportIcon: {
    marginRight: spacing.xs,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    lineHeight: 32,
  },
  sportType: {
    fontSize: fontSize.md,
    marginTop: 2,
  },
  sportTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  trainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  trainingBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  locationText: {
    fontSize: fontSize.sm,
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
  engagementCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  engagementItem: {
    alignItems: 'center',
    minWidth: 90,
  },
  engagementCount: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  engagementLabel: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  // Photo gallery styles
  // Fullscreen modal styles
  commentsSection: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  // Map toggle button styles
});
