import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, FlatList, Dimensions, ViewToken, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoutePreview } from './LeafletMap';
import { AutoPlayVideo } from './AutoPlayVideo';
import { AutoDisplayImage } from './AutoDisplayImage';
import { ExpandableContent } from './FeedCard.Media';
import { ImageViewer } from './ImageViewer';
import { ImageGallery } from './ImageGallery';
import { MediaSlider } from './MediaSlider';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

interface ActivityMediaSliderProps {
  activity: Activity;
  mediaItems: PostMediaItem[];
  imageUrls: string[];
  onActivityPress?: () => void;
  openGallery: (index: number) => void;
  setExpandedImage: (uri: string) => void;
}

function ActivityMediaSlider({ activity, mediaItems, imageUrls, onActivityPress, openGallery, setExpandedImage }: ActivityMediaSliderProps) {
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const hasRouteMap = activity.route_map_url || activity.route_svg;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  const renderItem = ({ item, index }: { item: PostMediaItem | { type: 'route' }; index: number }) => {
    // First slide is the route map
    if (item.type === 'route' && hasRouteMap) {
      return (
        <View style={activitySliderStyles.slide}>
          <TouchableOpacity
            style={[activitySliderStyles.routeContainer]}
            onPress={onActivityPress}
            activeOpacity={0.8}
            disabled={!onActivityPress}
          >
            <RoutePreview
              routeMapUrl={fixStorageUrl(activity.route_map_url)}
              routeSvg={activity.route_svg}
              trackData={undefined}
              activityId={activity.id}
              height={300}
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
        </View>
      );
    }

    // Media items (videos and photos)
    const mediaItem = item as PostMediaItem;
    if (mediaItem.type === 'video') {
      return (
        <View style={activitySliderStyles.slide}>
          <AutoPlayVideo
            videoUrl={mediaItem.url}
            thumbnailUrl={mediaItem.thumbnailUrl}
            aspectRatio={16 / 9}
          />
        </View>
      );
    }

    // Image
    const imageIndex = mediaItems.slice(0, index).filter(it => it.type === 'image').length;
    return (
      <View style={activitySliderStyles.slide}>
        <AutoDisplayImage
          imageUrl={mediaItem.url}
          onExpand={() => imageUrls.length > 1 ? openGallery(imageIndex) : setExpandedImage(mediaItem.url)}
          previewHeight={300}
        />
      </View>
    );
  };

  // Build slides array: route map first (if exists), then media items
  const slides = hasRouteMap
    ? [{ type: 'route' as const }, ...mediaItems]
    : mediaItems;

  return (
    <View style={activitySliderStyles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.type === 'route' ? 'route-map' : `${(item as PostMediaItem).id}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="center"
      />

      {/* Pagination dots */}
      {slides.length > 1 && (
        <View style={activitySliderStyles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                activitySliderStyles.dot,
                index === activeIndex && activitySliderStyles.dotActive
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const activitySliderStyles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  slide: {
    width: SCREEN_WIDTH,
  },
  routeContainer: {
    height: 300,
  },
  pagination: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

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

  // Build media items for slider (photos and videos combined)
  const mediaItems: PostMediaItem[] = [];
  postVideos.forEach((v) => mediaItems.push({
    id: v.id,
    type: 'video',
    url: fixStorageUrl(v.url) || '',
    thumbnailUrl: v.thumbnail_url ? fixStorageUrl(v.thumbnail_url) : null
  }));
  postPhotos.forEach((p) => mediaItems.push({
    id: p.id,
    type: 'image',
    url: fixStorageUrl(p.url) || ''
  }));

  const hasMedia = mediaItems.length > 0;
  const hasMultipleItems = hasRouteMap && hasMedia ? true : mediaItems.length > 1;

  return (
    <>
      <GalleryModals galleryVisible={galleryVisible} setGalleryVisible={setGalleryVisible} galleryIndex={galleryIndex} imageUrls={imageUrls} expandedImage={expandedImage} setExpandedImage={setExpandedImage} />

      {/* Title, description, and badges with padding */}
      <View style={styles.bodyPadding}>
        {post.title && <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>}
        {activity.description && <ExpandableContent text={activity.description} type="activity" />}
        <ActivityBadges activity={activity} pace={pace} />
      </View>

      {/* Full-bleed hero media */}
      {hasRouteMap && hasMedia ? (
        <View style={styles.fullBleedMedia}>
          <ActivityMediaSlider
            activity={activity}
            mediaItems={mediaItems}
            imageUrls={imageUrls}
            onActivityPress={onActivityPress}
            openGallery={openGallery}
            setExpandedImage={setExpandedImage}
          />
        </View>
      ) : hasRouteMap ? (
        <TouchableOpacity style={[styles.heroVisual, styles.fullBleedMedia, { borderRadius: 0, height: 300 }]} onPress={onActivityPress} activeOpacity={0.8} disabled={!onActivityPress}>
          <RoutePreview
            routeMapUrl={fixStorageUrl(activity.route_map_url)}
            routeSvg={activity.route_svg}
            trackData={undefined}
            activityId={activity.id}
            height={300}
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
      ) : mediaItems.length > 1 ? (
        <View style={styles.fullBleedMedia}>
          <MediaSlider
            items={mediaItems}
            onImagePress={(index) => {
              const item = mediaItems[index];
              if (item.type === 'image') {
                const imageIndex = mediaItems.slice(0, index + 1).filter(it => it.type === 'image').length - 1;
                imageUrls.length > 1 ? openGallery(imageIndex) : setExpandedImage(item.url);
              }
            }}
            aspectRatio={16 / 9}
            previewHeight={300}
          />
        </View>
      ) : mediaItems.length === 1 ? (
        mediaItems[0].type === 'video' ? (
          <View style={styles.fullBleedMedia}>
            <AutoPlayVideo
              key={`post-${post.id}-activity-video-${mediaItems[0].id}`}
              videoUrl={mediaItems[0].url}
              thumbnailUrl={mediaItems[0].thumbnailUrl}
              aspectRatio={16 / 9}
            />
          </View>
        ) : (
          <View style={[styles.heroVisualContainer, styles.fullBleedMedia]}>
            <AutoDisplayImage
              imageUrl={mediaItems[0].url}
              onExpand={() => setExpandedImage(mediaItems[0].url)}
              previewHeight={300}
            />
          </View>
        )
      ) : null}

      {/* Stats with padding */}
      <View style={styles.bodyPadding}>
        <ActivityStats activity={activity} heroStat={heroStat} />
      </View>
    </>
  );
}