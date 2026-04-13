import React, {useMemo, useRef, useState} from 'react';
import {Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View, ViewToken} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useTranslation} from 'react-i18next';
import {LazyRoutePreview as RoutePreview} from './LeafletMap';
import {FeedVideo} from './FeedVideo';
import {AutoDisplayImage} from './AutoDisplayImage';
import {MediaGrid} from './MediaGrid';
import {MentionText} from './MentionText';
import {ImageViewer} from './ImageViewer';
import {ImageGallery} from './ImageGallery';
import {useTheme} from '../hooks/useTheme';
import {useUnits} from '../hooks/useUnits';
import {fixStorageUrl} from '../config/api';
import type {Activity, Post} from '../types/api';
import {
  formatDuration,
  getEffortLevel,
  getSportIcon,
  type PostMediaItem,
  styles,
  truncateDescription,
  useImageGallery,
} from './FeedCard.utils';
import {borderRadius, fontSize, spacing} from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
/** Width of media area inside card padding (Card has padding: spacing.lg on each side + card border) */
const MEDIA_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - 2;

/* ──────────────────────────────────────────────────────────
 * Activity Stats — Prominent horizontal bar under the map
 * ────────────────────────────────────────────────────────── */
function ActivityStatsBar({ activity }: { activity: Activity }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatDistance: fmtDistance, formatElevation } = useUnits();

  const stats = [
    { label: t('activity.stats.distance'), value: fmtDistance(activity.distance), icon: 'navigate-outline' as const },
    { label: t('activity.stats.duration'), value: formatDuration(activity.duration), icon: 'time-outline' as const },
    { label: t('activity.stats.elevationGain'), value: formatElevation(activity.elevation_gain || 0), icon: 'trending-up' as const },
  ];

  return (
    <View style={[actStyles.statsBar, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
      {stats.map((stat, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={[actStyles.statsDivider, { backgroundColor: colors.border }]} />}
          <View style={actStyles.statItem}>
            <Text style={[actStyles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
            <Text style={[actStyles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

/* ──────────────────────────────────────────────────────────
 * Hero Route Map — Full-bleed map with distance overlay
 * ────────────────────────────────────────────────────────── */
function HeroRouteMap({ activity, onActivityPress }: { activity: Activity; onActivityPress?: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatDistance: fmtDistance } = useUnits();

  return (
    <TouchableOpacity
      style={actStyles.heroMapContainer}
      onPress={onActivityPress}
      activeOpacity={0.85}
      disabled={!onActivityPress}
    >
      <RoutePreview
        routePreviewUrl={fixStorageUrl(activity.route_preview_url)}
        routeMapUrl={fixStorageUrl(activity.route_map_url)}
        routeSvg={activity.route_svg}
        trackData={undefined}
        activityId={activity.id}
        height={280}
        backgroundColor={colors.background}
        showStartMarker={activity.gps_track?.show_start_marker ?? true}
        showFinishMarker={activity.gps_track?.show_finish_marker ?? true}
        startPoint={activity.gps_track?.start_point ?? null}
        finishPoint={activity.gps_track?.finish_point ?? null}
      />
      {/* Gradient overlay at bottom for distance badge */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)']}
        style={actStyles.heroGradient}
      />
      {/* Distance overlay */}
      {activity.distance > 0 && (
        <View style={actStyles.distanceOverlay}>
          <Text style={actStyles.distanceValue}>{fmtDistance(activity.distance)}</Text>
        </View>
      )}
      {/* View details button */}
      {onActivityPress && (
        <TouchableOpacity
          style={actStyles.viewDetailsBtn}
          onPress={onActivityPress}
          activeOpacity={0.8}
        >
          <Text style={actStyles.viewDetailsTxt}>{t('feed.viewDetails')}</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

/* ──────────────────────────────────────────────────────────
 * Activity Media Slider — route map + photos/videos carousel
 * ────────────────────────────────────────────────────────── */
function ActivityMediaSlider({
  activity, mediaItems, imageUrls, onActivityPress, openGallery, setExpandedImage,
}: {
  activity: Activity;
  mediaItems: PostMediaItem[];
  imageUrls: string[];
  onActivityPress?: () => void;
  openGallery: (index: number) => void;
  setExpandedImage: (uri: string) => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatDistance: fmtDistance } = useUnits();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const hasRouteMap = activity.route_preview_url || activity.route_map_url || activity.route_svg;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index || 0);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const slides = hasRouteMap
    ? [{ type: 'route' as const }, ...mediaItems]
    : mediaItems;

  const renderItem = ({ item, index }: { item: PostMediaItem | { type: 'route' }; index: number }) => {
    if (item.type === 'route' && hasRouteMap) {
      return (
        <View style={sliderStyles.slide}>
          <TouchableOpacity style={sliderStyles.routeContainer} onPress={onActivityPress} activeOpacity={0.85} disabled={!onActivityPress}>
            <RoutePreview
              routePreviewUrl={fixStorageUrl(activity.route_preview_url)}
              routeMapUrl={fixStorageUrl(activity.route_map_url)}
              routeSvg={activity.route_svg}
              trackData={undefined}
              activityId={activity.id}
              height={280}
              backgroundColor={colors.background}
              showStartMarker={activity.gps_track?.show_start_marker ?? true}
              showFinishMarker={activity.gps_track?.show_finish_marker ?? true}
              startPoint={activity.gps_track?.start_point ?? null}
              finishPoint={activity.gps_track?.finish_point ?? null}
            />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={actStyles.heroGradient} />
            {activity.distance > 0 && (
              <View style={actStyles.distanceOverlay}>
                <Text style={actStyles.distanceValue}>{fmtDistance(activity.distance)}</Text>
              </View>
            )}
            {onActivityPress && (
              <TouchableOpacity style={actStyles.viewDetailsBtn} onPress={onActivityPress} activeOpacity={0.8}>
                <Text style={actStyles.viewDetailsTxt}>{t('feed.viewDetails')}</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    const mediaItem = item as PostMediaItem;
    if (mediaItem.type === 'video') {
      return (
        <View style={sliderStyles.slide}>
          <FeedVideo videoUrl={mediaItem.url} thumbnailUrl={mediaItem.thumbnailUrl} aspectRatio={mediaItem.aspectRatio || 16 / 9} />
        </View>
      );
    }

    const imageIndex = mediaItems.slice(0, index).filter(it => it.type === 'image').length;
    return (
      <View style={sliderStyles.slide}>
        <AutoDisplayImage
          imageUrl={mediaItem.url}
          onExpand={() => imageUrls.length > 1 ? openGallery(imageIndex) : setExpandedImage(mediaItem.url)}
          previewHeight={280}
        />
      </View>
    );
  };

  return (
    <View style={sliderStyles.container}>
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
        snapToInterval={MEDIA_WIDTH}
        snapToAlignment="center"
        removeClippedSubviews
      />
      {slides.length > 1 && (
        <View style={sliderStyles.pagination}>
          {slides.map((_, i) => (
            <View key={i} style={[sliderStyles.dot, i === activeIndex && sliderStyles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

/* ──────────────────────────────────────────────────────────
 * Main ActivityBody
 * ────────────────────────────────────────────────────────── */
export function ActivityBody({ post, onActivityPress }: { post: Post; onActivityPress?: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { expandedImage, setExpandedImage, galleryVisible, setGalleryVisible, galleryIndex, openGallery } = useImageGallery();
  const activity = post.activity;
  if (!activity) return null;

  const [showFullDescription, setShowFullDescription] = useState(false);
  const truncatedDesc = activity.description
    ? truncateDescription(activity.description, 120)
    : { text: '', isTruncated: false };

  const hasRouteMap = activity.route_preview_url || activity.route_map_url || activity.route_svg;

  const { imageUrls, mediaItems } = useMemo(() => {
    const postVideos = post.videos || [];
    const postPhotos = post.photos || [];
    const urls = postPhotos.map(p => fixStorageUrl(p.url) || '');
    const items: PostMediaItem[] = [];
    postVideos.forEach(v => items.push({
      id: v.id, type: 'video', url: fixStorageUrl(v.url) || '',
      thumbnailUrl: v.thumbnail_url ? fixStorageUrl(v.thumbnail_url) : null,
      aspectRatio: v.width && v.height ? v.width / v.height : undefined,
    }));
    postPhotos.forEach(p => items.push({
      id: p.id, type: 'image', url: fixStorageUrl(p.url) || '',
    }));
    return { imageUrls: urls, mediaItems: items };
  }, [post.videos, post.photos]);

  const hasMedia = mediaItems.length > 0;

  // Determine effort level for badge color
  const effort = getEffortLevel(activity.sport_type?.name, activity.distance, activity.duration);
  const effortColors: Record<string, { bg: string; text: string }> = {
    Easy: { bg: colors.success + '20', text: colors.success },
    Moderate: { bg: colors.warning + '20', text: colors.warning },
    Hard: { bg: colors.error + '20', text: colors.error },
  };

  return (
    <>
      {/* Gallery modals */}
      {galleryVisible && imageUrls.length > 0 && (
        <ImageGallery images={imageUrls} initialIndex={galleryIndex} visible={galleryVisible} onClose={() => setGalleryVisible(false)} />
      )}
      {expandedImage && (
        <ImageViewer uri={expandedImage} visible onClose={() => setExpandedImage(null)} />
      )}

      {/* Description + sport badge row */}
      <View style={styles.bodyPadding}>
        {post.title && <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>}
        {activity.description && (
          <View>
            {activity.mentions ? (
              <MentionText
                text={showFullDescription ? activity.description : truncatedDesc.text}
                mentions={activity.mentions}
                style={[styles.expandableText, { color: colors.textPrimary }]}
              />
            ) : (
              <Text style={[styles.expandableText, { color: colors.textPrimary }]}>
                {showFullDescription ? activity.description : truncatedDesc.text}
              </Text>
            )}
            {truncatedDesc.isTruncated && !showFullDescription && (
              <TouchableOpacity onPress={() => setShowFullDescription(true)}>
                <Text style={[styles.showMoreLink, { color: colors.primary }]}>{t('feed.showMore')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Compact tag pills row */}
        <View style={actStyles.tagRow}>
          <View style={[actStyles.sportBadge, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name={getSportIcon(activity.sport_type?.name)} size={14} color={colors.primary} />
            <Text style={[actStyles.sportBadgeText, { color: colors.primary }]}>
              {activity.sport_type?.name || t('sports.other')}
            </Text>
          </View>
          {effort && effortColors[effort.label] && (
            <View style={[actStyles.sportBadge, { backgroundColor: effortColors[effort.label].bg }]}>
              <Text style={[actStyles.sportBadgeText, { color: effortColors[effort.label].text }]}>{effort.label}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Hero visual area — padded with rounded corners to match content */}
      {hasRouteMap && hasMedia ? (
        <View style={actStyles.paddedMedia}>
          <View style={actStyles.mediaRounded}>
            <ActivityMediaSlider
              activity={activity}
              mediaItems={mediaItems}
              imageUrls={imageUrls}
              onActivityPress={onActivityPress}
              openGallery={openGallery}
              setExpandedImage={setExpandedImage}
            />
          </View>
        </View>
      ) : hasRouteMap ? (
        <View style={actStyles.paddedMedia}>
          <View style={actStyles.mediaRounded}>
            <HeroRouteMap activity={activity} onActivityPress={onActivityPress} />
          </View>
        </View>
      ) : mediaItems.length > 1 ? (
        <View style={actStyles.paddedMedia}>
          <View style={actStyles.mediaRounded}>
            <MediaGrid items={mediaItems} />
          </View>
        </View>
      ) : mediaItems.length === 1 ? (
        mediaItems[0].type === 'video' ? (
          <View style={actStyles.paddedMedia}>
            <View style={actStyles.mediaRounded}>
              <FeedVideo
                key={`post-${post.id}-activity-video-${mediaItems[0].id}`}
                videoUrl={mediaItems[0].url}
                thumbnailUrl={mediaItems[0].thumbnailUrl}
                aspectRatio={mediaItems[0].aspectRatio || 16 / 9}
              />
            </View>
          </View>
        ) : (
          <View style={actStyles.paddedMedia}>
            <View style={actStyles.mediaRounded}>
              <AutoDisplayImage
                imageUrl={mediaItems[0].url}
                onExpand={() => setExpandedImage(mediaItems[0].url)}
                previewHeight={280}
              />
            </View>
          </View>
        )
      ) : null}

      {/* Stats bar — prominent, always visible */}
      <ActivityStatsBar activity={activity} />
    </>
  );
}

/* ──────────────────────────────────────────────────────────
 * Styles
 * ────────────────────────────────────────────────────────── */
const actStyles = StyleSheet.create({
  // Stats bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  statsDivider: {
    width: 1,
    height: 32,
    marginHorizontal: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Padded media — no extra horizontal padding, Card already provides spacing.lg
  paddedMedia: {
    marginTop: spacing.sm,
  },
  mediaRounded: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },

  // Hero map
  heroMapContainer: {
    height: 280,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  distanceOverlay: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.lg,
  },
  distanceValue: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  viewDetailsBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  viewDetailsTxt: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  // Tag pills
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  sportBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});

const sliderStyles = StyleSheet.create({
  container: { position: 'relative' },
  slide: { width: MEDIA_WIDTH },
  routeContainer: { height: 280, position: 'relative', overflow: 'hidden' },
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
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    width: 8, height: 8, borderRadius: 4,
  },
});