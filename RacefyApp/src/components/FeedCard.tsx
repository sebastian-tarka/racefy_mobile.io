import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow, format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { RoutePreview } from './LeafletMap';
import { SocialShareModal } from './SocialShareModal';
import { AutoPlayVideo } from './AutoPlayVideo';
import { AutoDisplayImage } from './AutoDisplayImage';
import { ImageViewer } from './ImageViewer';
import { ImageGallery } from './ImageGallery';
import { useTheme } from '../hooks/useTheme';
import { fixStorageUrl } from '../config/api';
import { spacing, fontSize, borderRadius } from '../theme';
import type { Post, Activity } from '../types/api';

// ============ TYPE RESOLUTION ============

type FeedPostType = 'general' | 'activity' | 'event' | 'sponsored';

function getEffectiveType(post: Post): FeedPostType {
  if ((post as any).is_sponsored) return 'sponsored';
  if (post.type === 'activity') return 'activity';
  if (post.type === 'event') return 'event';
  return 'general';
}

// These will be initialized in the component where colors are available
let BORDER_COLORS: Record<FeedPostType, string | null> = {
  general: null,
  activity: '#10b981',
  event: '#3b82f6',
  sponsored: '#f59e0b',
};

let TYPE_BADGE_COLORS: Record<FeedPostType, string> = {
  general: '#10b981',
  activity: '#10b981',
  event: '#3b82f6',
  sponsored: '#f59e0b',
};

let EXPAND_COLORS: Record<FeedPostType, string> = {
  general: '#10b981',
  activity: '#10b981',
  event: '#3b82f6',
  sponsored: '#f59e0b',
};

// ============ PROPS ============

export interface FeedCardProps {
  post: Post;
  isOwner?: boolean;
  onUserPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onActivityPress?: () => void;
  onEventPress?: () => void;
  onMenu?: (action: 'edit' | 'delete' | 'report') => void;
}

// ============ EXPANDABLE CONTENT (text truncation) ============

const TEXT_TRUNCATION: Record<FeedPostType, { maxLength: number; maxSentences: number }> = {
  general: { maxLength: 200, maxSentences: 2 },
  activity: { maxLength: 100, maxSentences: 2 },
  event: { maxLength: 200, maxSentences: 2 },
  sponsored: { maxLength: 200, maxSentences: 2 },
};

function truncateText(text: string, maxLength: number, maxSentences: number): { truncated: string; isTruncated: boolean } {
  if (text.length <= maxLength) return { truncated: text, isTruncated: false };

  const sentences = text.split(/[.!?]+/).filter(Boolean);
  let truncated = '';
  for (let i = 0; i < Math.min(sentences.length, maxSentences); i++) {
    truncated += sentences[i] + (sentences[i + 1] ? (text.match(/[.!?]/)?.[0] || '.') : '');
  }
  truncated = truncated.substring(0, maxLength);
  return { truncated, isTruncated: text.length > truncated.length };
}

function ExpandableContent({
  text,
  type,
}: {
  text: string;
  type: FeedPostType;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const rules = TEXT_TRUNCATION[type];
  const { truncated, isTruncated } = truncateText(text, rules.maxLength, rules.maxSentences);
  const color = EXPAND_COLORS[type];

  return (
    <View>
      <Text style={[styles.expandableText, { color: colors.textPrimary }]}>{expanded ? text : truncated}</Text>
      {isTruncated && !expanded && (
        <TouchableOpacity onPress={() => setExpanded(true)}>
          <Text style={[styles.expandableToggle, { color }]}>{t('feed.showMore')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============ POST MEDIA (heroMode) ============

interface PostMediaItem {
  id: number;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string | null;
}

function buildMediaItems(post: Post): PostMediaItem[] {
  const videos: PostMediaItem[] = (post.videos || []).map((v) => ({
    id: v.id,
    type: 'video' as const,
    url: fixStorageUrl(v.url) || '',
    thumbnailUrl: v.thumbnail_url ? fixStorageUrl(v.thumbnail_url) : null,
  }));

  const photos: PostMediaItem[] = (post.photos || []).map((p) => ({
    id: p.id,
    type: 'image' as const,
    url: fixStorageUrl(p.url) || '',
  }));

  const media: PostMediaItem[] = (post.media || []).map((m) => {
    const isVideo = m.mime_type?.startsWith('video/') || m.url?.toLowerCase().match(/\.(mp4|mov|webm)(\?|$)/);
    return {
      id: m.id,
      type: (isVideo ? 'video' : 'image') as 'video' | 'image',
      url: fixStorageUrl(m.url) || '',
      thumbnailUrl: m.thumbnail_url ? fixStorageUrl(m.thumbnail_url) : null,
    };
  });

  // Videos first (higher visual weight), then photos, then general media
  return [...videos, ...photos, ...media];
}

function PostMedia({
  post,
  heroMode = true,
}: {
  post: Post;
  heroMode?: boolean;
}) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const items = buildMediaItems(post);
  if (items.length === 0) return null;

  // Extract all image URLs for gallery
  const imageUrls = items.filter(item => item.type === 'image').map(item => item.url);

  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setGalleryVisible(true);
  };

  if (heroMode) {
    const hero = items[0];
    const rest = items.slice(1);

    return (
      <View>
        {/* Hero item: full-bleed */}
        {hero.type === 'video' ? (
          <AutoPlayVideo
            videoUrl={hero.url}
            thumbnailUrl={hero.thumbnailUrl}
            aspectRatio={16 / 9}
          />
        ) : (
          <View style={styles.heroMediaContainer}>
            <AutoDisplayImage
              imageUrl={hero.thumbnailUrl || hero.url}
              onExpand={() => imageUrls.length > 1 ? openGallery(0) : setExpandedImage(hero.thumbnailUrl || hero.url)}
              previewHeight={300}
            />
          </View>
        )}

        {/* Rest in 2-col grid */}
        {rest.length > 0 && (
          <View style={styles.mediaGrid}>
            {rest.map((item, i) => {
              const itemIndex = i + 1; // Offset by 1 since hero is index 0
              const imageIndex = items.slice(0, itemIndex + 1).filter(it => it.type === 'image').length - 1;

              return (
                <TouchableOpacity
                  key={item.id + '-' + i}
                  style={styles.mediaGridItem}
                  activeOpacity={0.9}
                  onPress={() => {
                    if (item.type === 'image') {
                      openGallery(imageIndex);
                    }
                  }}
                >
                  <Image
                    source={{ uri: item.thumbnailUrl || item.url }}
                    style={styles.mediaGridImage}
                    resizeMode="cover"
                  />
                  {item.type === 'video' && (
                    <View style={styles.playOverlaySmall}>
                      <Ionicons name="play" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Multi-image indicator */}
        {imageUrls.length > 1 && (
          <View style={styles.imageIndicator}>
            <View style={styles.imageIndicatorBadge}>
              <Ionicons name="images-outline" size={12} color="#fff" />
              <View style={styles.imageIndicatorText}>
                <Ionicons name="ellipse" size={4} color="#fff" style={{ marginHorizontal: 2 }} />
                <Ionicons name="ellipse" size={4} color="rgba(255,255,255,0.5)" style={{ marginHorizontal: 2 }} />
                <Ionicons name="ellipse" size={4} color="rgba(255,255,255,0.5)" style={{ marginHorizontal: 2 }} />
              </View>
            </View>
          </View>
        )}

        {/* Image gallery modal */}
        {galleryVisible && imageUrls.length > 0 && (
          <ImageGallery
            images={imageUrls}
            initialIndex={galleryIndex}
            visible={galleryVisible}
            onClose={() => setGalleryVisible(false)}
          />
        )}

        {/* Legacy single image modal (kept for compatibility) */}
        {expandedImage && (
          <ImageViewer
            uri={expandedImage}
            visible={true}
            onClose={() => setExpandedImage(null)}
          />
        )}
      </View>
    );
  }

  // heroMode=false: supplementary grid
  if (items.length === 1) {
    const item = items[0];
    if (item.type === 'video') {
      return (
        <AutoPlayVideo
          videoUrl={item.url}
          thumbnailUrl={item.thumbnailUrl}
          aspectRatio={16 / 9}
        />
      );
    }
    return (
      <>
        <View style={styles.supplementaryMediaContainer}>
          <AutoDisplayImage
            imageUrl={item.thumbnailUrl || item.url}
            onExpand={() => imageUrls.length > 1 ? openGallery(0) : setExpandedImage(item.thumbnailUrl || item.url)}
            previewHeight={300}
          />
        </View>
        {/* Image gallery modal */}
        {galleryVisible && imageUrls.length > 0 && (
          <ImageGallery
            images={imageUrls}
            initialIndex={galleryIndex}
            visible={galleryVisible}
            onClose={() => setGalleryVisible(false)}
          />
        )}
        {/* Modal for expanded image */}
        {expandedImage && (
          <ImageViewer
            uri={expandedImage}
            visible={true}
            onClose={() => setExpandedImage(null)}
          />
        )}
      </>
    );
  }

  const visible = items.slice(0, 4);
  const remaining = items.length - 4;

  return (
    <>
      <View style={styles.mediaGrid}>
        {visible.map((item, i) => {
          const imageIndex = items.slice(0, i + 1).filter(it => it.type === 'image').length - 1;

          return (
            <TouchableOpacity
              key={item.id + '-' + i}
              style={styles.mediaGridItem}
              activeOpacity={0.9}
              onPress={() => {
                if (item.type === 'image' && imageUrls.length > 0) {
                  openGallery(imageIndex);
                }
              }}
            >
              <Image
                source={{ uri: item.thumbnailUrl || item.url }}
                style={styles.mediaGridImage}
                resizeMode="cover"
              />
              {item.type === 'video' && (
                <View style={styles.playOverlaySmall}>
                  <Ionicons name="play" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        {remaining > 0 && (
          <TouchableOpacity
            style={styles.mediaGridItem}
            activeOpacity={0.9}
            onPress={() => imageUrls.length > 0 && openGallery(Math.min(3, imageUrls.length - 1))}
          >
            <View style={[styles.mediaGridImage, styles.moreBadge]}>
              <Text style={styles.moreBadgeText}>+{remaining}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Multi-image indicator */}
        {imageUrls.length > 1 && (
          <View style={styles.imageIndicator}>
            <View style={styles.imageIndicatorBadge}>
              <Ionicons name="images-outline" size={12} color="#fff" />
            </View>
          </View>
        )}
      </View>

      {/* Image gallery modal */}
      {galleryVisible && imageUrls.length > 0 && (
        <ImageGallery
          images={imageUrls}
          initialIndex={galleryIndex}
          visible={galleryVisible}
          onClose={() => setGalleryVisible(false)}
        />
      )}

      {/* Modal for expanded image */}
      {expandedImage && (
        <ImageViewer
          uri={expandedImage}
          visible={true}
          onClose={() => setExpandedImage(null)}
        />
      )}
    </>
  );
}

// ============ FEED CARD HEADER ============

function FeedCardHeader({
  post,
  type,
  isOwner,
  onUserPress,
  onMenu,
}: {
  post: Post;
  type: FeedPostType;
  isOwner: boolean;
  onUserPress?: () => void;
  onMenu?: (action: 'edit' | 'delete' | 'report') => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const isSponsored = type === 'sponsored';
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false });
  const badgeColor = TYPE_BADGE_COLORS[type];

  const visibilityConfig: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
    public: { icon: 'eye-outline', label: t('feed.visibility.public') },
    followers: { icon: 'people-outline', label: t('feed.visibility.followers') },
    private: { icon: 'lock-closed-outline', label: t('feed.visibility.private') },
  };

  if (isSponsored) {
    return (
      <View style={styles.headerRow}>
        <View style={styles.headerSponsoredIcon}>
          <View style={[styles.sponsoredCircle, { backgroundColor: '#f59e0b' }]}>
            <Ionicons name="star" size={16} color="#fff" />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.headerName, { color: colors.textPrimary }]}>
              {(post as any).campaign_name || post.title || t('feed.postTypes.sponsored')}
            </Text>
            <View style={styles.headerMetaRow}>
              <View style={[styles.typeBadge, { backgroundColor: badgeColor + '15' }]}>
                <Ionicons name="star" size={10} color={badgeColor} />
                <Text style={[styles.typeBadgeText, { color: badgeColor }]}>{t('feed.postTypes.sponsored')}</Text>
              </View>
              <Text style={[styles.headerTime, { color: colors.textMuted }]}>{timeAgo}</Text>
            </View>
          </View>
        </View>
        {onMenu && (
          <View style={styles.menuContainer}>
            <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)} style={styles.menuButton}>
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {menuOpen && (
              <View style={[styles.menuDropdown, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { setMenuOpen(false); onMenu('report'); }}
                >
                  <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>{t('feed.report')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.headerRow}>
      <TouchableOpacity style={styles.headerUserBlock} onPress={onUserPress} disabled={!onUserPress}>
        <Avatar uri={post.user?.avatar} name={post.user?.name} size="md" />
        <View style={styles.headerTextBlock}>
          <Text style={[styles.headerName, { color: colors.textPrimary }]}>{post.user?.name}</Text>
          <View style={styles.headerMetaRow}>
            {type !== 'general' && (
              <View style={[styles.typeBadge, { backgroundColor: badgeColor + '15' }]}>
                <Ionicons
                  name={type === 'activity' ? 'fitness-outline' : 'calendar-outline'}
                  size={10}
                  color={badgeColor}
                />
                <Text style={[styles.typeBadgeText, { color: badgeColor }]}>{t(`feed.postTypes.${type}`)}</Text>
              </View>
            )}
            {isOwner && post.visibility && visibilityConfig[post.visibility] && (
              <View style={styles.visibilityPill}>
                <Ionicons name={visibilityConfig[post.visibility].icon} size={10} color={colors.textMuted} />
                <Text style={[styles.visibilityPillText, { color: colors.textMuted }]}>
                  {visibilityConfig[post.visibility].label}
                </Text>
              </View>
            )}
            <Text style={[styles.headerTime, { color: colors.textMuted }]}>
              @{post.user?.username} · {timeAgo}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      {onMenu && (
        <View style={styles.menuContainer}>
          <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)} style={styles.menuButton}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {menuOpen && (
            <View style={[styles.menuDropdown, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              {isOwner ? (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { setMenuOpen(false); onMenu('edit'); }}
                  >
                    <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>{t('feed.edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { setMenuOpen(false); onMenu('delete'); }}
                  >
                    <Text style={[styles.menuItemText, { color: colors.error }]}>{t('feed.delete')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { setMenuOpen(false); onMenu('report'); }}
                >
                  <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>{t('feed.report')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ============ FEED CARD ACTIONS ============

function FeedCardActions({
  post,
  isOwner,
  onLike,
  onComment,
}: {
  post: Post;
  isOwner: boolean;
  onLike?: () => void;
  onComment?: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [shareVisible, setShareVisible] = useState(false);

  return (
    <View style={[styles.actionsRow, { borderTopColor: colors.borderLight }]}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={onLike}
        disabled={isOwner || !onLike}
      >
        <Ionicons
          name={post.is_liked ? 'heart' : 'heart-outline'}
          size={20}
          color={post.is_liked ? colors.error : colors.textSecondary}
        />
        <Text style={[styles.actionText, { color: colors.textSecondary }, post.is_liked && { color: colors.error }]}>
          {post.likes_count}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={onComment}
        disabled={!onComment}
      >
        <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.actionText, { color: colors.textSecondary }]}>{post.comments_count}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButtonShare}
        onPress={() => setShareVisible(true)}
      >
        <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.actionText, { color: colors.textSecondary }]}>{t('common.share')}</Text>
      </TouchableOpacity>

      <SocialShareModal
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        type="post"
        id={post.id}
        title={post.title}
        description={post.content}
      />
    </View>
  );
}

// ============ BODY: GENERAL ============

function GeneralBody({ post }: { post: Post }) {
  const { colors } = useTheme();
  return (
    <View style={styles.bodyPadding}>
      {post.title && (
        <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>
      )}
      {post.content && (
        <ExpandableContent text={post.content} type="general" />
      )}
      <PostMedia post={post} heroMode />
    </View>
  );
}

// ============ BODY: ACTIVITY ============

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${meters} m`;
}

function formatPace(meters: number, seconds: number): string {
  if (meters === 0) return '-';
  const paceSecondsPerKm = (seconds / meters) * 1000;
  const paceMinutes = Math.floor(paceSecondsPerKm / 60);
  const paceSeconds = Math.floor(paceSecondsPerKm % 60);
  return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
}

function getEffortLevel(sportName: string | undefined, meters: number, seconds: number): { label: string; emoji: string } | null {
  if (meters === 0 || seconds === 0) return null;
  const paceSecondsPerKm = (seconds / meters) * 1000;

  let easy: number, moderate: number;
  const name = (sportName || '').toLowerCase();
  if (name.includes('run')) { easy = 7.5 * 60; moderate = 6 * 60; }
  else if (name.includes('cycl') || name.includes('bike')) { easy = 5 * 60; moderate = 3 * 60; }
  else { easy = 14 * 60; moderate = 10 * 60; }

  if (paceSecondsPerKm > easy) return { label: 'Easy', emoji: '😊' };
  if (paceSecondsPerKm > moderate) return { label: 'Moderate', emoji: '😐' };
  return { label: 'Hard', emoji: '😤' };
}

function getSportIcon(sportName?: string): keyof typeof Ionicons.glyphMap {
  const name = (sportName || '').toLowerCase();
  if (name.includes('run')) return 'walk-outline';
  if (name.includes('cycl') || name.includes('bike')) return 'bicycle-outline';
  if (name.includes('swim')) return 'water-outline';
  if (name.includes('gym') || name.includes('fitness')) return 'barbell-outline';
  if (name.includes('yoga')) return 'body-outline';
  return 'fitness-outline';
}

function getHeroStat(activity: Activity): 'distance' | 'duration' | 'elevation' {
  const name = (activity.sport_type?.name || '').toLowerCase();
  if (activity.elevation_gain && activity.elevation_gain > 200) return 'elevation';
  if (name.includes('cycl') || name.includes('bike')) return 'duration';
  return 'distance';
}

function ActivityBody({ post, onActivityPress }: { post: Post; onActivityPress?: () => void }) {
  const { colors } = useTheme();
  const activity = post.activity;
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  if (!activity) return null;

  const hasRouteMap = activity.route_map_url || activity.route_svg;
  const heroStat = getHeroStat(activity);
  const effort = getEffortLevel(activity.sport_type?.name, activity.distance, activity.duration);
  const pace = formatPace(activity.distance, activity.duration);

  // Determine hero visual: map > video > photo
  const postVideos = post.videos || [];
  const postPhotos = post.photos || [];

  // Build image URLs for gallery
  const imageUrls = postPhotos.map(p => fixStorageUrl(p.url) || '');

  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setGalleryVisible(true);
  };

  return (
    <View style={styles.bodyPadding}>
      {post.title && <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>}
      {activity.description && (
        <ExpandableContent text={activity.description} type="activity" />
      )}

      {/* Primary badges: sport type + pace */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name={getSportIcon(activity.sport_type?.name)} size={14} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>{activity.sport_type?.name || 'Activity'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="speedometer-outline" size={14} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>{pace}</Text>
        </View>
      </View>

      {/* Secondary badges: effort, time of day, weather */}
      {effort && (
        <View style={styles.badgeRow}>
          <View style={[styles.badgeSecondary, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{effort.emoji} {effort.label}</Text>
          </View>
        </View>
      )}

      {/* Hero visual - FORCE STATIC MAP in feed (no trackData) */}
      {hasRouteMap ? (
        <TouchableOpacity
          style={styles.heroVisual}
          onPress={onActivityPress}
          activeOpacity={0.8}
          disabled={!onActivityPress}
        >
          <RoutePreview
            routeMapUrl={fixStorageUrl(activity.route_map_url)}
            routeSvg={activity.route_svg}
            trackData={undefined}
            activityId={activity.id}
            height={160}
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
        <AutoPlayVideo
          videoUrl={fixStorageUrl(postVideos[0].url) || ''}
          thumbnailUrl={postVideos[0].thumbnail_url ? fixStorageUrl(postVideos[0].thumbnail_url) : null}
          aspectRatio={16 / 9}
        />
      ) : postPhotos.length > 0 ? (
        <View style={styles.heroVisualContainer}>
          <AutoDisplayImage
            imageUrl={fixStorageUrl(postPhotos[0].url) || ''}
            onExpand={() => imageUrls.length > 1 ? openGallery(0) : setExpandedImage(fixStorageUrl(postPhotos[0].url) || '')}
            previewHeight={300}
          />
        </View>
      ) : null}

      {/* Secondary media strip */}
      {(() => {
        const secondaryItems: PostMediaItem[] = [];
        if (hasRouteMap) {
          // All post media is secondary
          postVideos.forEach((v) => secondaryItems.push({ id: v.id, type: 'video', url: fixStorageUrl(v.url) || '', thumbnailUrl: v.thumbnail_url ? fixStorageUrl(v.thumbnail_url) : null }));
          postPhotos.forEach((p) => secondaryItems.push({ id: p.id, type: 'image', url: fixStorageUrl(p.url) || '' }));
        } else if (postVideos.length > 0) {
          // Videos after first are secondary, plus photos
          postVideos.slice(1).forEach((v) => secondaryItems.push({ id: v.id, type: 'video', url: fixStorageUrl(v.url) || '', thumbnailUrl: v.thumbnail_url ? fixStorageUrl(v.thumbnail_url) : null }));
          postPhotos.forEach((p) => secondaryItems.push({ id: p.id, type: 'image', url: fixStorageUrl(p.url) || '' }));
        } else if (postPhotos.length > 1) {
          postPhotos.slice(1).forEach((p) => secondaryItems.push({ id: p.id, type: 'image', url: fixStorageUrl(p.url) || '' }));
        }
        if (secondaryItems.length === 0) return null;
        return (
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
        );
      })()}

      {/* Stats row: hero stat (emerald card) + 2 secondary (gray badges) */}
      <View style={styles.statsRow}>
        {heroStat === 'distance' && (
          <View style={[styles.heroStatCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
            <Ionicons name="navigate-outline" size={16} color={colors.primary} />
            <Text style={[styles.heroStatValue, { color: colors.primary }]}>{formatDistance(activity.distance)}</Text>
            <Text style={[styles.heroStatLabel, { color: colors.primary }]}>Distance</Text>
          </View>
        )}
        {heroStat === 'duration' && (
          <View style={[styles.heroStatCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={[styles.heroStatValue, { color: colors.primary }]}>{formatDuration(activity.duration)}</Text>
            <Text style={[styles.heroStatLabel, { color: colors.primary }]}>Duration</Text>
          </View>
        )}
        {heroStat === 'elevation' && (
          <View style={[styles.heroStatCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
            <Ionicons name="trending-up" size={16} color={colors.primary} />
            <Text style={[styles.heroStatValue, { color: colors.primary }]}>{activity.elevation_gain}m</Text>
            <Text style={[styles.heroStatLabel, { color: colors.primary }]}>Elevation</Text>
          </View>
        )}

        {/* Two secondary stat badges */}
        {heroStat !== 'duration' && (
          <View style={[styles.secondaryStatBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.secondaryStatText, { color: colors.textSecondary }]}>{formatDuration(activity.duration)}</Text>
          </View>
        )}
        {heroStat !== 'elevation' && activity.elevation_gain && activity.elevation_gain > 0 ? (
          <View style={[styles.secondaryStatBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="trending-up" size={12} color={colors.textSecondary} />
            <Text style={[styles.secondaryStatText, { color: colors.textSecondary }]}>{activity.elevation_gain}m</Text>
          </View>
        ) : heroStat !== 'distance' ? (
          <View style={[styles.secondaryStatBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="navigate-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.secondaryStatText, { color: colors.textSecondary }]}>{formatDistance(activity.distance)}</Text>
          </View>
        ) : null}
      </View>

      {/* Image gallery modal */}
      {galleryVisible && imageUrls.length > 0 && (
        <ImageGallery
          images={imageUrls}
          initialIndex={galleryIndex}
          visible={galleryVisible}
          onClose={() => setGalleryVisible(false)}
        />
      )}

      {/* Modal for expanded image */}
      {expandedImage && (
        <ImageViewer
          uri={expandedImage}
          visible={true}
          onClose={() => setExpandedImage(null)}
        />
      )}
    </View>
  );
}

// ============ BODY: EVENT ============

function EventBody({ post, onEventPress }: { post: Post; onEventPress?: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const event = post.event;
  if (!event) return null;

  const coverUrl = event.cover_image_url ? fixStorageUrl(event.cover_image_url) : null;

  // Build image URLs for gallery (cover + post photos/media)
  const imageUrls: string[] = [];
  if (coverUrl) imageUrls.push(coverUrl);
  (post.photos || []).forEach(p => {
    const url = fixStorageUrl(p.url);
    if (url) imageUrls.push(url);
  });

  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setGalleryVisible(true);
  };

  return (
    <View style={styles.bodyPadding}>
      {post.title && <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>}

      {/* Cover image (hero) */}
      {coverUrl && (
        <View style={styles.heroMediaContainer}>
          <AutoDisplayImage
            imageUrl={coverUrl}
            onExpand={() => imageUrls.length > 1 ? openGallery(0) : setExpandedImage(coverUrl)}
            previewHeight={300}
          />
        </View>
      )}

      {post.content && (
        <ExpandableContent text={post.content} type="event" />
      )}

      {/* Info box */}
      <View style={[styles.infoBox, { backgroundColor: colors.infoLight, borderColor: colors.info + '30' }]}>
        <View style={styles.infoBoxRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.info} />
          <Text style={[styles.infoBoxText, { color: colors.textPrimary }]}>
            {format(new Date(event.starts_at), 'EEE, MMM d, yyyy h:mm a')}
          </Text>
        </View>
        {event.location_name && (
          <View style={styles.infoBoxRow}>
            <Ionicons name="location-outline" size={16} color={colors.info} />
            <Text style={[styles.infoBoxText, { color: colors.textPrimary }]}>{event.location_name}</Text>
          </View>
        )}
        <View style={styles.infoBoxRow}>
          <Ionicons name="people-outline" size={16} color={colors.info} />
          <Text style={[styles.infoBoxText, { color: colors.textPrimary }]}>
            {t('feed.participants', { count: event.participants_count })}
          </Text>
          {onEventPress && (
            <TouchableOpacity onPress={onEventPress} style={styles.infoBoxLink}>
              <Text style={[styles.infoBoxLinkText, { color: colors.info }]}>{t('feed.viewDetails')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Supplementary media (heroMode=false) */}
      <PostMedia post={post} heroMode={false} />

      {/* Image gallery modal */}
      {galleryVisible && imageUrls.length > 0 && (
        <ImageGallery
          images={imageUrls}
          initialIndex={galleryIndex}
          visible={galleryVisible}
          onClose={() => setGalleryVisible(false)}
        />
      )}

      {/* Modal for expanded cover image */}
      {expandedImage && (
        <ImageViewer
          uri={expandedImage}
          visible={true}
          onClose={() => setExpandedImage(null)}
        />
      )}
    </View>
  );
}

// ============ BODY: SPONSORED ============

function SponsoredBody({ post }: { post: Post }) {
  const { colors } = useTheme();
  return (
    <View style={styles.bodyPadding}>
      {post.title && <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>}

      {/* Media first (product-first layout), heroMode=true */}
      <PostMedia post={post} heroMode />

      {post.content && (
        <ExpandableContent text={post.content} type="sponsored" />
      )}

      {/* CTA button */}
      {(post as any).sponsored_data.cta_url && (post as any).sponsored_data.cta_text && (
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: '#f59e0b' }]}
          activeOpacity={0.8}
          onPress={() => {
            const url = (post as any).sponsored_data.promoted_link || (post as any).sponsored_data.cta_url;
            void Linking.openURL(url);
          }}
        >
          <Text style={styles.ctaButtonText}>{(post as any).sponsored_data.cta_text}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============ MAIN FEED CARD ============

const BODY_COMPONENTS: Record<FeedPostType, React.ComponentType<any>> = {
  general: GeneralBody,
  activity: ActivityBody,
  event: EventBody,
  sponsored: SponsoredBody,
};

export function FeedCard({
  post,
  isOwner = false,
  onUserPress,
  onLike,
  onComment,
  onActivityPress,
  onEventPress,
  onMenu,
}: FeedCardProps) {
  const { colors } = useTheme();
  const type = getEffectiveType(post);

  // Update color constants with theme colors
  BORDER_COLORS = {
    general: null,
    activity: colors.primary,
    event: colors.info,
    sponsored: colors.warning,
  };

  TYPE_BADGE_COLORS = {
    general: colors.primary,
    activity: colors.primary,
    event: colors.info,
    sponsored: colors.warning,
  };

  EXPAND_COLORS = {
    general: colors.primary,
    activity: colors.primary,
    event: colors.info,
    sponsored: colors.warning,
  };

  const borderColor = BORDER_COLORS[type];
  const Body = BODY_COMPONENTS[type];
  const marginBottom = type === 'general' ? 12 : 20;

  return (
    <Card
      style={[
        { marginBottom },
        ...(borderColor ? [{ borderLeftWidth: 4, borderLeftColor: borderColor }] : []),
      ]}
    >
      <FeedCardHeader
        post={post}
        type={type}
        isOwner={isOwner}
        onUserPress={onUserPress}
        onMenu={onMenu}
      />

      <Body
        post={post}
        onActivityPress={onActivityPress}
        onEventPress={onEventPress}
      />

      <FeedCardActions
        post={post}
        isOwner={isOwner}
        onLike={onLike}
        onComment={onComment}
      />
    </Card>
  );
}

// ============ STYLES ============

const styles = StyleSheet.create({
  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  headerUserBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerSponsoredIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sponsoredCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerTextBlock: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  headerTime: {
    fontSize: fontSize.xs,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 3,
  },
  typeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  visibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  visibilityPillText: {
    fontSize: fontSize.xs,
  },
  menuContainer: {
    position: 'relative',
  },
  menuButton: {
    padding: spacing.sm,
  },
  menuDropdown: {
    position: 'absolute',
    top: 32,
    right: 0,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: 140,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  menuItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  menuItemText: {
    fontSize: fontSize.sm,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xl,
  },
  actionButtonShare: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  actionText: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
  },

  // Body padding
  bodyPadding: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  bodyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },

  // Expandable content
  expandableText: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  expandableToggle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
  },

  // Media - Hero mode
  heroMedia: {
    marginTop: spacing.md,
    height: 200,
    borderRadius: 0,
    overflow: 'hidden',
  },
  heroMediaImage: {
    width: '100%',
    height: '100%',
  },
  heroMediaContainer: {
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  mediaGridItem: {
    width: '50%',
    height: 120,
    position: 'relative',
  },
  mediaGridImage: {
    width: '100%',
    height: '100%',
  },

  // Media - supplementary (no hero)
  supplementaryMedia: {
    marginTop: spacing.md,
    height: 180,
    overflow: 'hidden',
  },
  supplementaryImage: {
    width: '100%',
    height: '100%',
  },
  supplementaryMediaContainer: {
    marginTop: spacing.md,
    overflow: 'hidden',
  },

  // Play overlay
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 3,
  },
  expandOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  expandIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlaySmall: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },

  // More badge in grid
  moreBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  moreBadgeText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '700',
  },

  // Activity: badges
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
    minHeight: 32,
  },
  badgeSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    gap: 4,
    minHeight: 32,
  },
  badgeText: {
    fontSize: fontSize.sm,
  },

  // Activity: hero visual
  heroVisual: {
    marginTop: spacing.md,
    height: 160,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  heroVisualImage: {
    width: '100%',
    height: '100%',
  },
  heroVisualContainer: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  heroVisualOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Activity: secondary media strip
  secondaryStrip: {
    marginTop: spacing.sm,
    flexDirection: 'row',
  },
  secondaryThumb: {
    width: 80,
    height: 80,
    marginRight: spacing.xs,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  secondaryThumbImage: {
    width: '100%',
    height: '100%',
  },

  // Activity: stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroStatCard: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 2,
  },
  heroStatValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  heroStatLabel: {
    fontSize: fontSize.xs,
  },
  secondaryStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  secondaryStatText: {
    fontSize: fontSize.sm,
  },

  // Event: info box
  infoBox: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  infoBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  infoBoxText: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  infoBoxLink: {
    marginLeft: 'auto',
  },
  infoBoxLinkText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  // Sponsored: CTA button
  ctaButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '700',
  },

  // Image indicator for multi-image posts
  imageIndicator: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    zIndex: 5,
  },
  imageIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    gap: 4,
  },
  imageIndicatorText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
