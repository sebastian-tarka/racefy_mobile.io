import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Card, Button, Loading, Avatar, RoutePreview, ScreenHeader, CommentSection, BoostButton } from '../../components';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { fixStorageUrl } from '../../config/api';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Activity, GpsTrack, User } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'ActivityDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function ActivityDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { activityId } = route.params;
  const scrollViewRef = useRef<ScrollView>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [gpsTrack, setGpsTrack] = useState<GpsTrack | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const mapHeightAnim = useRef(new Animated.Value(250)).current;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
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
        } catch (trackError) {
          logger.debug('gps', 'Failed to load GPS track', { error: trackError });
        }
      } else {
        logger.debug('gps', 'Activity has no GPS track');
      }
    } catch (err) {
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

  const handleDelete = useCallback(() => {
    Alert.alert(
      t('activityDetail.deleteActivity'),
      t('activityDetail.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteActivity(activityId);
              navigation.goBack();
            } catch (error) {
              Alert.alert(t('common.error'), t('activityDetail.deleteFailed'));
            }
          },
        },
      ]
    );
  }, [activityId, navigation, t]);

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatPace = (seconds: number, meters: number): string => {
    if (meters === 0) return '--:--';
    const paceSeconds = (seconds / meters) * 1000;
    const mins = Math.floor(paceSeconds / 60);
    const secs = Math.floor(paceSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')} /km`;
  };

  const formatSpeed = (metersPerSecond: number | null): string => {
    if (!metersPerSecond) return '--';
    const kmh = metersPerSecond * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  };

  const getSportIcon = (): keyof typeof Ionicons.glyphMap => {
    const sportName = activity?.sport_type?.name?.toLowerCase() || '';
    if (sportName.includes('run')) return 'walk-outline';
    if (sportName.includes('cycling') || sportName.includes('bike')) return 'bicycle-outline';
    if (sportName.includes('swim')) return 'water-outline';
    if (sportName.includes('gym') || sportName.includes('fitness')) return 'barbell-outline';
    if (sportName.includes('yoga')) return 'body-outline';
    return 'fitness-outline';
  };

  const handleLike = useCallback(async () => {
    if (!activity || activity.is_owner) return;

    // Optimistic update
    const previousLiked = isLiked;
    const previousCount = likesCount;

    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    try {
      if (isLiked) {
        await api.unlikeActivity(activityId);
      } else {
        await api.likeActivity(activityId);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      logger.error('activity', 'Failed to like/unlike activity', { error });
    }
  }, [activity, activityId, isLiked, likesCount]);

  const toggleMapExpand = useCallback(() => {
    const newExpandedState = !isMapExpanded;
    setIsMapExpanded(newExpandedState);

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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader
          title={t('activityDetail.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error || t('activityDetail.notFound')}</Text>
          <Button title={t('common.tryAgain')} onPress={fetchActivity} variant="primary" />
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = activity?.is_owner ?? false;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('activityDetail.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          isOwner ? (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ActivityForm', { activityId })}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="create-outline" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
          ) : undefined
        }
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
        >
          {/* Map Section */}
          {activity.has_gps_track && (gpsTrack?.route_map_url || gpsTrack?.route_svg || gpsTrack?.track_data) && (
          <Animated.View style={{ height: mapHeightAnim }}>
            <RoutePreview
              routeMapUrl={fixStorageUrl(gpsTrack.route_map_url)}
              routeSvg={gpsTrack.route_svg}
              trackData={gpsTrack?.track_data}
              activityId={activity.id}
              height={isMapExpanded ? 500 : 250}
              enableZoom={isMapExpanded}
            />
            {/* Map Expand/Collapse Toggle Button */}
            <TouchableOpacity
              style={[styles.mapToggleButton, { backgroundColor: colors.cardBackground }]}
              onPress={toggleMapExpand}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isMapExpanded ? 'contract-outline' : 'expand-outline'}
                size={20}
                color={colors.textPrimary}
              />
              <Text style={[styles.mapToggleText, { color: colors.textPrimary }]}>
                {isMapExpanded ? t('activityDetail.collapseMap') : t('activityDetail.expandMap')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Title Section */}
        <View style={[styles.titleSection, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.titleRow}>
            <Ionicons name={getSportIcon()} size={28} color={colors.primary} />
            <View style={styles.titleContent}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{activity.title}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {activity.sport_type?.name || t('activityDetail.activity')} ·{' '}
                {format(new Date(activity.started_at), 'EEEE, MMMM d, yyyy')}
              </Text>
              {/* Location display */}
              {activity.location?.location_name && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.locationText, { color: colors.textMuted }]}>
                    {activity.location.location_name}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {activity.user && (
            <TouchableOpacity
              style={[styles.userRow, { borderTopColor: colors.border }]}
              onPress={() => navigation.navigate('UserProfile', { username: activity.user!.username })}
            >
              <Avatar uri={activity.user.avatar} name={activity.user.name} size="sm" />
              <Text style={[styles.userName, { color: colors.textPrimary }]}>{activity.user.name}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Main Stats */}
        <Card style={styles.statsCard}>
          <View style={styles.mainStats}>
            <View style={styles.mainStatItem}>
              <Text style={[styles.mainStatValue, { color: colors.textPrimary }]}>{formatDuration(activity.duration)}</Text>
              <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>{t('activityDetail.duration')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.mainStatItem}>
              <Text style={[styles.mainStatValue, { color: colors.textPrimary }]}>{formatDistance(activity.distance)}</Text>
              <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>{t('activityDetail.distance')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.mainStatItem}>
              <Text style={[styles.mainStatValue, { color: colors.textPrimary }]}>
                {formatPace(activity.duration, activity.distance)}
              </Text>
              <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>{t('activityDetail.pace')}</Text>
            </View>
          </View>
        </Card>

        {/* Secondary Stats */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('activityDetail.stats')}</Text>
          <View style={styles.statsGrid}>
            {activity.calories !== null && activity.calories > 0 && (
              <View style={styles.statGridItem}>
                <Ionicons name="flame-outline" size={20} color={colors.primary} />
                <Text style={[styles.statGridValue, { color: colors.textPrimary }]}>{activity.calories}</Text>
                <Text style={[styles.statGridLabel, { color: colors.textMuted }]}>{t('activityDetail.calories')}</Text>
              </View>
            )}
            {activity.elevation_gain !== null && activity.elevation_gain > 0 && (
              <View style={styles.statGridItem}>
                <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
                <Text style={[styles.statGridValue, { color: colors.textPrimary }]}>{Math.round(activity.elevation_gain)} m</Text>
                <Text style={[styles.statGridLabel, { color: colors.textMuted }]}>{t('activityDetail.elevationGain')}</Text>
              </View>
            )}
            {activity.avg_speed !== null && (
              <View style={styles.statGridItem}>
                <Ionicons name="speedometer-outline" size={20} color={colors.primary} />
                <Text style={[styles.statGridValue, { color: colors.textPrimary }]}>{formatSpeed(activity.avg_speed)}</Text>
                <Text style={[styles.statGridLabel, { color: colors.textMuted }]}>{t('activityDetail.avgSpeed')}</Text>
              </View>
            )}
            {activity.max_speed !== null && (
              <View style={styles.statGridItem}>
                <Ionicons name="flash-outline" size={20} color={colors.primary} />
                <Text style={[styles.statGridValue, { color: colors.textPrimary }]}>{formatSpeed(activity.max_speed)}</Text>
                <Text style={[styles.statGridLabel, { color: colors.textMuted }]}>{t('activityDetail.maxSpeed')}</Text>
              </View>
            )}
            {activity.avg_heart_rate !== null && (
              <View style={styles.statGridItem}>
                <Ionicons name="heart-outline" size={20} color={colors.error} />
                <Text style={[styles.statGridValue, { color: colors.textPrimary }]}>{activity.avg_heart_rate} bpm</Text>
                <Text style={[styles.statGridLabel, { color: colors.textMuted }]}>{t('activityDetail.avgHeartRate')}</Text>
              </View>
            )}
            {activity.max_heart_rate !== null && (
              <View style={styles.statGridItem}>
                <Ionicons name="heart" size={20} color={colors.error} />
                <Text style={[styles.statGridValue, { color: colors.textPrimary }]}>{activity.max_heart_rate} bpm</Text>
                <Text style={[styles.statGridLabel, { color: colors.textMuted }]}>{t('activityDetail.maxHeartRate')}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Description */}
        {activity.description && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('activityDetail.description')}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>{activity.description}</Text>
          </Card>
        )}

        {/* Photo Gallery */}
        {activity.photos && activity.photos.length > 0 && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('activityDetail.photos')} ({activity.photos.length})
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoGallery}
            >
              {activity.photos.map((photo, index) => (
                <TouchableOpacity
                  key={photo.id}
                  onPress={() => setSelectedPhotoIndex(index)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: fixStorageUrl(photo.url) || '' }}
                    style={styles.photoThumbnail}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card>
        )}

        {/* Fullscreen Photo Modal */}
        <Modal
          visible={selectedPhotoIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPhotoIndex(null)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setSelectedPhotoIndex(null)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            {selectedPhotoIndex !== null && activity.photos && (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  contentOffset={{ x: selectedPhotoIndex * SCREEN_WIDTH, y: 0 }}
                  onMomentumScrollEnd={(e) => {
                    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setSelectedPhotoIndex(newIndex);
                  }}
                >
                  {activity.photos.map((photo) => (
                    <View key={photo.id} style={styles.modalImageContainer}>
                      <Image
                        source={{ uri: fixStorageUrl(photo.url) || '' }}
                        style={styles.modalImage}
                        resizeMode="contain"
                      />
                    </View>
                  ))}
                </ScrollView>

                {/* Photo counter */}
                <View style={styles.photoCounter}>
                  <Text style={styles.photoCounterText}>
                    {selectedPhotoIndex + 1} / {activity.photos.length}
                  </Text>
                </View>
              </>
            )}
          </View>
        </Modal>

        {/* Activity Info */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('activityDetail.info')}</Text>
          <View style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('activityDetail.date')}</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {format(new Date(activity.started_at), 'PPpp')}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
            <Ionicons name="phone-portrait-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('activityDetail.source')}</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {activity.source === 'app'
                ? t('activityDetail.sources.app')
                : activity.source === 'manual'
                  ? t('activityDetail.sources.manual')
                  : activity.source === 'gpx_import'
                    ? t('activityDetail.sources.gpxImport')
                    : activity.source}
            </Text>
          </View>
          {gpsTrack && (
            <View style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
              <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('activityDetail.gpsPoints')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {gpsTrack.points_count.toLocaleString()} {t('activityDetail.points')}
              </Text>
            </View>
          )}
        </Card>

          {/* Engagement Section */}
          <Card style={styles.engagementCard}>
            <View style={styles.engagementRow}>
              {/* Likes */}
              <TouchableOpacity
                style={styles.engagementItem}
                onPress={handleLike}
                disabled={isOwner}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isLiked ? '#E53E3E' : colors.textMuted}
                />
                <Text style={[styles.engagementCount, { color: colors.textPrimary }]}>
                  {likesCount}
                </Text>
                <Text style={[styles.engagementLabel, { color: colors.textMuted }]}>
                  {t('engagement.likes')}
                </Text>
              </TouchableOpacity>

              {/* Boosts */}
              <View style={styles.engagementItem}>
                <BoostButton
                  activityId={activity.id}
                  initialBoostsCount={activity.boosts_count || 0}
                  initialIsBoosted={activity.is_boosted || false}
                  disabled={isOwner}
                />
              </View>

              {/* Comments */}
              <View style={styles.engagementItem}>
                <Ionicons name="chatbubble-outline" size={24} color={colors.textMuted} />
                <Text style={[styles.engagementCount, { color: colors.textPrimary }]}>
                  {activity.comments_count || 0}
                </Text>
                <Text style={[styles.engagementLabel, { color: colors.textMuted }]}>
                  {t('engagement.comments')}
                </Text>
              </View>
            </View>
          </Card>

          {/* Comments Section */}
          <View style={styles.section}>
            <CommentSection
              commentableType="activity"
              commentableId={activityId}
              onUserPress={(user: User) => navigation.navigate('UserProfile', { username: user.username })}
              onInputFocus={scrollToBottom}
            />
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  titleSection: {
    padding: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  titleContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  locationText: {
    fontSize: fontSize.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  statsCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  mainStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  mainStatValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  mainStatLabel: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    marginVertical: spacing.xs,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statGridItem: {
    width: '50%',
    paddingVertical: spacing.sm,
    alignItems: 'flex-start',
  },
  statGridValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  statGridLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  description: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
    flex: 1,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
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
  engagementCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  engagementItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  engagementCount: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  engagementLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  // Photo gallery styles
  photoGallery: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  photoThumbnail: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
  },
  // Fullscreen modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.full,
  },
  modalImageContainer: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  photoCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  photoCounterText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  // Map toggle button styles
  mapToggleButton: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    gap: spacing.xs,
  },
  mapToggleText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
