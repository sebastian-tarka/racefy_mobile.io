import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoutePreview } from './LeafletMap';
import { AutoPlayVideo } from './AutoPlayVideo';
import { AutoDisplayImage } from './AutoDisplayImage';
import { ExpandableContent } from './FeedCard.Media';
import { ImageViewer } from './ImageViewer';
import { ImageGallery } from './ImageGallery';
import { useTheme } from '../hooks/useTheme';
import { fixStorageUrl } from '../config/api';
import type { Post, Activity } from '../types/api';
import {
  type PostMediaItem,
  formatDuration,
  formatDistance,
  formatPace,
  getEffortLevel,
  getSportIcon,
  getHeroStat,
  useImageGallery,
  styles,
} from './FeedCard.utils';

function ActivityBadges({ activity, pace }: { activity: Activity; pace: string }) {
  const { colors } = useTheme();
  const effort = getEffortLevel(activity.sport_type?.name, activity.distance, activity.duration);

  return (
    <>
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name={getSportIcon(activity.sport_type?.name)} size={14} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>{activity.sport_type?.name || 'Activity'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="speedometer-outline" size={14} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>{pace}</Text>
        </View>
        {effort && (
            <View style={styles.badgeRow}>
              <View style={[styles.badgeSecondary, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{effort.emoji} {effort.label}</Text>
              </View>
            </View>
        )}
      </View>
    </>
  );
}

function ActivityStats({ activity, heroStat }: { activity: Activity; heroStat: 'distance' | 'duration' | 'elevation' }) {
  const { colors } = useTheme();
  const stats = {
    distance: { icon: 'navigate-outline', value: formatDistance(activity.distance), label: 'Distance' },
    duration: { icon: 'time-outline', value: formatDuration(activity.duration), label: 'Duration' },
    elevation: { icon: 'trending-up', value: `${activity.elevation_gain}m`, label: 'Elevation' },
  };

  const hero = stats[heroStat];
  const secondary = Object.entries(stats).filter(([key]) => key !== heroStat);

  return (
    <View style={styles.statsRow}>
      <View style={[styles.heroStatCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
        <Ionicons name={hero.icon as any} size={16} color={colors.primary} />
        <Text style={[styles.heroStatValue, { color: colors.primary }]}>{hero.value}</Text>
        {/*<Text style={[styles.heroStatLabel, { color: colors.primary }]}>{hero.label}</Text>*/}
      </View>
      {secondary.slice(0, 2).map(([key, stat]) => (
        activity.elevation_gain || key !== 'elevation' ? (
          <View key={key} style={[styles.secondaryStatBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name={stat.icon as any} size={12} color={colors.textSecondary} />
            <Text style={[styles.secondaryStatText, { color: colors.textSecondary }]}>{stat.value}</Text>
          </View>
        ) : null
      ))}
    </View>
  );
}

function GalleryModals({ galleryVisible, setGalleryVisible, galleryIndex, imageUrls, expandedImage, setExpandedImage }: any) {
  return (
    <>
      {galleryVisible && imageUrls.length > 0 && (
        <ImageGallery images={imageUrls} initialIndex={galleryIndex} visible={galleryVisible} onClose={() => setGalleryVisible(false)} />
      )}
      {expandedImage && (
        <ImageViewer uri={expandedImage} visible={true} onClose={() => setExpandedImage(null)} />
      )}
    </>
  );
}

export function ActivityBody({ post, onActivityPress }: { post: Post; onActivityPress?: () => void }) {
  const { colors } = useTheme();
  const { expandedImage, setExpandedImage, galleryVisible, setGalleryVisible, galleryIndex, openGallery } = useImageGallery();
  const activity = post.activity;
  if (!activity) return null;

  const hasRouteMap = activity.route_map_url || activity.route_svg;
  const heroStat = getHeroStat(activity);
  const pace = formatPace(activity.distance, activity.duration);
  const postVideos = post.videos || [];
  const postPhotos = post.photos || [];
  const imageUrls = postPhotos.map(p => fixStorageUrl(p.url) || '');

  const secondaryItems: PostMediaItem[] = [];
  if (hasRouteMap) {
    postVideos.forEach((v) => secondaryItems.push({ id: v.id, type: 'video', url: fixStorageUrl(v.url) || '', thumbnailUrl: v.thumbnail_url ? fixStorageUrl(v.thumbnail_url) : null }));
    postPhotos.forEach((p) => secondaryItems.push({ id: p.id, type: 'image', url: fixStorageUrl(p.url) || '' }));
  } else if (postVideos.length > 0) {
    postVideos.slice(1).forEach((v) => secondaryItems.push({ id: v.id, type: 'video', url: fixStorageUrl(v.url) || '', thumbnailUrl: v.thumbnail_url ? fixStorageUrl(v.thumbnail_url) : null }));
    postPhotos.forEach((p) => secondaryItems.push({ id: p.id, type: 'image', url: fixStorageUrl(p.url) || '' }));
  } else if (postPhotos.length > 1) {
    postPhotos.slice(1).forEach((p) => secondaryItems.push({ id: p.id, type: 'image', url: fixStorageUrl(p.url) || '' }));
  }

  return (
    <>
      {/* Title, description, and badges with padding */}
      <View style={styles.bodyPadding}>
        {post.title && <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>}
        {activity.description && <ExpandableContent text={activity.description} type="activity" />}
        <ActivityBadges activity={activity} pace={pace} />
      </View>

      {/* Full-bleed hero media */}
      {hasRouteMap ? (
        <TouchableOpacity style={[styles.heroVisual, styles.fullBleedMedia, { borderRadius: 0, height: 220 }]} onPress={onActivityPress} activeOpacity={0.8} disabled={!onActivityPress}>
          <RoutePreview
            routeMapUrl={fixStorageUrl(activity.route_map_url)}
            routeSvg={activity.route_svg}
            trackData={undefined}
            activityId={activity.id}
            height={220}
            backgroundColor={colors.background}
            showStartMarker={activity.gps_track?.show_start_marker ?? true}
            showFinishMarker={activity.gps_track?.show_finish_marker ?? true}
            startPoint={activity.gps_track?.start_point ?? null}
            finishPoint={activity.gps_track?.finish_point ?? null}
          />
          {onActivityPress && (
            <View style={styles.heroVisualOverlay}>
              <Ionicons name="expand" size={18} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      ) : postVideos.length > 0 ? (
        <View style={styles.fullBleedMedia}>
          <AutoPlayVideo key={`post-${post.id}-activity-video-${postVideos[0].id}`} videoUrl={fixStorageUrl(postVideos[0].url) || ''} thumbnailUrl={postVideos[0].thumbnail_url ? fixStorageUrl(postVideos[0].thumbnail_url) : null} aspectRatio={16 / 9} />
        </View>
      ) : postPhotos.length > 0 ? (
        <View style={[styles.heroVisualContainer, styles.fullBleedMedia]}>
          <AutoDisplayImage imageUrl={fixStorageUrl(postPhotos[0].url) || ''} onExpand={() => imageUrls.length > 1 ? openGallery(0) : setExpandedImage(fixStorageUrl(postPhotos[0].url) || '')} previewHeight={300} />
        </View>
      ) : null}

      {/* Secondary media and stats with padding */}
      <View style={styles.bodyPadding}>
        {secondaryItems.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.secondaryStrip}>
            {secondaryItems.slice(0, 4).map((item, i) => (
              <TouchableOpacity key={item.id + '-' + i} style={styles.secondaryThumb} activeOpacity={0.9}>
                <Image source={{ uri: item.thumbnailUrl || item.url }} style={styles.secondaryThumbImage} resizeMode="cover" />
                {item.type === 'video' && (
                  <View style={styles.playOverlaySmall}>
                    <Ionicons name="play" size={12} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {secondaryItems.length > 4 && (
              <View style={styles.secondaryThumb}>
                <View style={[styles.secondaryThumbImage, styles.moreBadge]}>
                  <Text style={styles.moreBadgeText}>+{secondaryItems.length - 4}</Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        <ActivityStats activity={activity} heroStat={heroStat} />
      </View>
    </>
  );
}