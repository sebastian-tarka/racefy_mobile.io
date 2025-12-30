import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Card, Button, Loading, Avatar, RoutePreview } from '../../components';
import { api } from '../../services/api';
import { fixStorageUrl } from '../../config/api';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Activity, GpsTrack } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'ActivityDetail'>;

export function ActivityDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { activityId } = route.params;
  const [activity, setActivity] = useState<Activity | null>(null);
  const [gpsTrack, setGpsTrack] = useState<GpsTrack | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchActivity = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getActivity(activityId);
      setActivity(data);

      // Fetch GPS track if available
      if (data.has_gps_track) {
        try {
          const track = await api.getActivityTrack(activityId);
          console.log('GPS Track loaded:', {
            hasTrack: !!track,
            pointsCount: track?.points_count,
            hasRouteMapUrl: !!track?.route_map_url,
            routeMapUrl: track?.route_map_url,
            hasRouteSvg: !!track?.route_svg,
          });
          setGpsTrack(track);
        } catch (trackError) {
          console.log('Failed to load GPS track:', trackError);
        }
      } else {
        console.log('Activity has no GPS track');
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

  if (isLoading) {
    return <Loading fullScreen message={t('activityDetail.loading')} />;
  }

  if (error || !activity) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('activityDetail.title')}</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error || t('activityDetail.notFound')}</Text>
          <Button title={t('common.tryAgain')} onPress={fetchActivity} variant="primary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('activityDetail.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {/* Map Section */}
        {activity.has_gps_track && (gpsTrack?.route_map_url || gpsTrack?.route_svg) && (
          <RoutePreview
            routeMapUrl={fixStorageUrl(gpsTrack.route_map_url)}
            routeSvg={gpsTrack.route_svg}
            height={250}
          />
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

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
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
});
