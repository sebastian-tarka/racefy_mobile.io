import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, FlatList, Dimensions, ViewToken, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RoutePreview } from './LeafletMap';
import { AutoPlayVideo } from './AutoPlayVideo';
import { AutoDisplayImage } from './AutoDisplayImage';
import { ExpandableContent } from './FeedCard.Media';
import { MentionText } from './MentionText';
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
  getTimeOfDay,
  truncateDescription,
  useImageGallery,
  styles,
} from './FeedCard.utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function ActivityTagPills({ activity }: { activity: Activity }) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const duration = formatDuration(activity.duration);
  const effort = getEffortLevel(activity.sport_type?.name, activity.distance, activity.duration);
  const timeOfDay = activity.started_at ? getTimeOfDay(activity.started_at) : null;

  // Difficulty badge colors
  const difficultyColors = {
    Easy: { bg: colors.success + '20', text: colors.success },
    Moderate: { bg: colors.warning + '20', text: colors.warning },
    Hard: { bg: colors.error + '20', text: colors.error },
  };

  const effortColors = effort ? difficultyColors[effort.label as keyof typeof difficultyColors] : null;

  return (
    <View style={styles.tagPillsRow}>
      {/* Sport Type */}
      <View style={[styles.tagPill, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name={getSportIcon(activity.sport_type?.name)} size={14} color={colors.primary} />
        <Text style={[styles.badgeText, { color: colors.primary }]}>
          {activity.sport_type?.name || t('sports.other')}
        </Text>
      </View>

      {/* Difficulty */}
      {effort && effortColors && (
        <View style={[styles.tagPill, { backgroundColor: effortColors.bg }]}>
          <Text style={[styles.badgeText, { color: effortColors.text }]}>{effort.label}</Text>
        </View>
      )}

      {/* Time of Day */}
      {timeOfDay && (
        <View style={[styles.tagPill, { backgroundColor: colors.info + '15' }]}>
          <Ionicons
            name={
              timeOfDay === 'morning' ? 'sunny-outline' :
              timeOfDay === 'afternoon' ? 'partly-sunny-outline' :
              'moon-outline'
            }
            size={14}
            color={colors.info}
          />
          <Text style={[styles.badgeText, { color: colors.info }]}>
            {t(`timeOfDay.${timeOfDay}`)}
          </Text>
        </View>
      )}
    </View>
  );
}

function ActivityStatsNew({ activity }: { activity: Activity }) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const stats = [
    {
      icon: 'navigate-outline',
      value: formatDistance(activity.distance),
      label: t('activity.stats.distance')
    },
    {
      icon: 'time-outline',
      value: formatDuration(activity.duration),
      label: t('activity.stats.duration')
    },
    {
      icon: 'trending-up',
      value: `${activity.elevation_gain || 0}m`,
      label: t('activity.stats.elevationGain'),
      show: true // Always show, even if 0
    },
  ];

  return (
    <View style={styles.statsRowNew}>
      {stats.map((stat, index) => (
        <View key={index} style={styles.statColumn}>
          <Ionicons name={stat.icon as any} size={20} color={colors.textSecondary} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stat.value}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {stat.label}
          </Text>
        </View>
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
  const { t } = useTranslation();
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
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={onActivityPress}
                activeOpacity={0.8}
              >
                <Text style={styles.viewDetailsText}>{t('feed.viewDetails')}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
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
  const { t } = useTranslation();
  const { expandedImage, setExpandedImage, galleryVisible, setGalleryVisible, galleryIndex, openGallery } = useImageGallery();
  const activity = post.activity;
  if (!activity) return null;

  const [showFullDescription, setShowFullDescription] = useState(false);
  const truncatedDescription = activity.description
    ? truncateDescription(activity.description, 120)
    : { text: '', isTruncated: false };

  const hasRouteMap = activity.route_map_url || activity.route_svg;

  const { imageUrls, mediaItems } = useMemo(() => {
    const postVideos = post.videos || [];
    const postPhotos = post.photos || [];
    const urls = postPhotos.map(p => fixStorageUrl(p.url) || '');
    const items: PostMediaItem[] = [];
    postVideos.forEach((v) => items.push({
      id: v.id,
      type: 'video' as const,
      url: fixStorageUrl(v.url) || '',
      thumbnailUrl: v.thumbnail_url ? fixStorageUrl(v.thumbnail_url) : null,
    }));
    postPhotos.forEach((p) => items.push({
      id: p.id,
      type: 'image' as const,
      url: fixStorageUrl(p.url) || '',
    }));
    return { imageUrls: urls, mediaItems: items };
  }, [post.videos, post.photos]);

  const hasMedia = mediaItems.length > 0;
  const hasMultipleItems = hasRouteMap && hasMedia ? true : mediaItems.length > 1;

  return (
    <>
      <GalleryModals galleryVisible={galleryVisible} setGalleryVisible={setGalleryVisible} galleryIndex={galleryIndex} imageUrls={imageUrls} expandedImage={expandedImage} setExpandedImage={setExpandedImage} />

      {/* Title, description, and badges with padding */}
      <View style={styles.bodyPadding}>
        {post.title && <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>}
        {activity.description && (
          <View>
            {activity.mentions ? (
              <MentionText
                text={showFullDescription ? activity.description : truncatedDescription.text}
                mentions={activity.mentions}
                style={[styles.expandableText, { color: colors.textPrimary }]}
              />
            ) : (
              <Text style={[styles.expandableText, { color: colors.textPrimary }]}>
                {showFullDescription ? activity.description : truncatedDescription.text}
              </Text>
            )}
            {truncatedDescription.isTruncated && !showFullDescription && (
              <TouchableOpacity onPress={() => setShowFullDescription(true)}>
                <Text style={[styles.showMoreLink, { color: colors.primary }]}>
                  {t('feed.showMore')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <ActivityTagPills activity={activity} />
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
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={onActivityPress}
              activeOpacity={0.8}
            >
              <Text style={styles.viewDetailsText}>{t('feed.viewDetails')}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
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
        <ActivityStatsNew activity={activity} />
      </View>
    </>
  );
}