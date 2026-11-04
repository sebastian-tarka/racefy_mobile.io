import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, fontSize, spacing, msFont } from '../theme';
import type { ThemeColors } from '../theme';
import { fixStorageUrl } from '../config/api';
import type { Media, Photo, Post, Video } from '../types/api';
import { pickFullSizeUrl, pickVariant } from '../utils/imageVariants';

// Re-export from canonical locations for backwards compatibility
export { formatDuration } from '../utils/formatDuration';
export { getSportIcon } from '../utils/sportIcon';

// ============ TYPES & INTERFACES ============

export type FeedPostType =
  | 'general'
  | 'activity'
  | 'event'
  | 'sponsored'
  | 'reshare'
  | 'achievement'
  | 'challenge'
  | 'digest'
  | 'milestone';

export interface PostMediaItem {
  id: number;
  type: 'image' | 'video';
  /** The original file: the video itself, or the full-size photo — the fallback everywhere. */
  url: string;
  /** Grid cells: the `medium` photo variant, or the video poster. */
  thumbnailUrl?: string | null;
  /** Full-width card preview: `large` photo variant, then `medium`, else nothing (→ original). */
  previewUrl?: string | null;
  /** Full-screen viewer: `xlarge` → `large` photo variant, else nothing (→ original). */
  fullUrl?: string | null;
  aspectRatio?: number; // width/height from API
}

/** URL a full-width card shows for an item: sized preview, else poster, else the original. */
export const previewUrlOf = (item: PostMediaItem): string =>
  item.previewUrl || item.thumbnailUrl || item.url;

/** URL the full-screen viewer opens for an item. */
export const fullUrlOf = (item: PostMediaItem): string => item.fullUrl || item.url;

export function photoMediaItem(photo: Photo): PostMediaItem {
  return {
    id: photo.id,
    type: 'image',
    url: fixStorageUrl(photo.url) || '',
    thumbnailUrl: fixStorageUrl(pickVariant(photo.variants, ['medium', 'small'], null)),
    previewUrl: fixStorageUrl(pickVariant(photo.variants, ['large', 'medium'], null)),
    fullUrl: fixStorageUrl(pickFullSizeUrl(photo.variants, null)),
  };
}

export function videoMediaItem(video: Video): PostMediaItem {
  return {
    id: video.id,
    type: 'video',
    url: fixStorageUrl(video.url) || '',
    thumbnailUrl: fixStorageUrl(
      pickVariant(video.thumbnail_variants, ['medium', 'small'], video.thumbnail_url),
    ),
    aspectRatio: video.width && video.height ? video.width / video.height : undefined,
  };
}

function mediaMediaItem(media: Media): PostMediaItem {
  const isVideo =
    media.type === 'video' ||
    media.mime_type?.startsWith('video/') ||
    /\.(mp4|mov|webm)(\?|$)/.test(media.url?.toLowerCase() ?? '');
  const aspectRatio = media.width && media.height ? media.width / media.height : undefined;
  if (isVideo) {
    return {
      id: media.id,
      type: 'video',
      url: fixStorageUrl(media.url) || '',
      thumbnailUrl: fixStorageUrl(
        pickVariant(media.thumbnail_variants, ['medium', 'small'], media.thumbnail_url),
      ),
      aspectRatio,
    };
  }
  return {
    id: media.id,
    type: 'image',
    url: fixStorageUrl(media.url) || '',
    thumbnailUrl: fixStorageUrl(
      pickVariant(media.variants, ['medium', 'small'], media.thumbnail_url),
    ),
    previewUrl: fixStorageUrl(pickVariant(media.variants, ['large', 'medium'], null)),
    fullUrl: fixStorageUrl(pickFullSizeUrl(media.variants, null)),
    aspectRatio,
  };
}

export interface FeedCardProps {
  post: Post;
  isOwner?: boolean;
  onUserPress?: () => void;
  /** Notifies parent after a like/unlike has been confirmed by the server */
  onLikeChange?: (isLiked: boolean, likesCount: number) => void;
  /** Notifies parent after a boost/unboost has been confirmed by the server */
  onBoostChange?: (isBoosted: boolean, boostsCount: number) => void;
  onComment?: () => void;
  onShareActivity?: () => void;
  onActivityPress?: () => void;
  onEventPress?: () => void;
  onMenu?: (action: 'edit' | 'delete' | 'report') => void;
  onReshare?: (content?: string, visibility?: string) => void;
  onUnreshare?: () => void;
  onOriginalPostUserPress?: (username: string) => void;
}

// ============ CONSTANTS ============

export const TEXT_TRUNCATION: Record<FeedPostType, { maxLength: number; maxSentences: number }> = {
  general: { maxLength: 200, maxSentences: 2 },
  activity: { maxLength: 100, maxSentences: 2 },
  event: { maxLength: 200, maxSentences: 2 },
  sponsored: { maxLength: 200, maxSentences: 2 },
  reshare: { maxLength: 200, maxSentences: 2 },
  achievement: { maxLength: 200, maxSentences: 2 },
  challenge: { maxLength: 200, maxSentences: 2 },
  digest: { maxLength: 200, maxSentences: 2 },
  milestone: { maxLength: 200, maxSentences: 2 },
};

// ============ UTILITY FUNCTIONS ============

export function getEffectiveType(post: Post): FeedPostType {
  if ((post as any).is_sponsored) return 'sponsored';
  if (post.shared_post || post.shared_post_deleted) return 'reshare';
  if (post.type === 'activity') return 'activity';
  if (post.type === 'event') return 'event';
  if (post.type === 'achievement') return 'achievement';
  if (post.type === 'challenge') return 'challenge';
  if (post.type === 'digest') return 'digest';
  if (post.type === 'milestone') return 'milestone';
  return 'general';
}

export function getTypeColors(type: FeedPostType, colors: ThemeColors) {
  const colorMap: Record<FeedPostType, string> = {
    general: colors.primary,
    activity: colors.primary,
    event: colors.info,
    sponsored: colors.warning,
    reshare: '#06b6d4',
    achievement: '#EAB308',
    challenge: colors.warning, // amber
    digest: colors.primary, // emerald
    milestone: '#8B5CF6', // violet-500
  };
  return {
    accent: type === 'general' ? null : colorMap[type],
    badge: colorMap[type],
    expand: colorMap[type],
  };
}

export function getTypeIcon(type: FeedPostType): keyof typeof Ionicons.glyphMap | null {
  const iconMap: Record<FeedPostType, keyof typeof Ionicons.glyphMap | null> = {
    general: null,
    activity: 'fitness-outline',
    event: 'calendar-outline',
    sponsored: 'megaphone-outline',
    reshare: 'repeat-outline',
    achievement: 'trophy-outline',
    challenge: 'flame-outline',
    digest: 'stats-chart-outline',
    milestone: 'sparkles-outline',
  };
  return iconMap[type];
}

export function truncateText(
  text: string,
  maxLength: number,
  maxSentences: number,
): { truncated: string; isTruncated: boolean } {
  if (text.length <= maxLength) return { truncated: text, isTruncated: false };
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  let truncated = '';
  for (let i = 0; i < Math.min(sentences.length, maxSentences); i++) {
    truncated += sentences[i] + (sentences[i + 1] ? text.match(/[.!?]/)?.[0] || '.' : '');
  }
  truncated = truncated.substring(0, maxLength);
  return { truncated, isTruncated: text.length > truncated.length };
}

export function buildMediaItems(post: Post): PostMediaItem[] {
  return [
    ...(post.videos || []).map(videoMediaItem),
    ...(post.photos || []).map(photoMediaItem),
    ...(post.media || []).map(mediaMediaItem),
  ];
}

export function getEffortLevel(
  sportName: string | undefined,
  meters: number,
  seconds: number,
): { label: string; emoji: string } | null {
  if (meters === 0 || seconds === 0) return null;
  const paceSecondsPerKm = (seconds / meters) * 1000;
  const name = (sportName || '').toLowerCase();
  let easy: number, moderate: number;
  if (name.includes('run')) {
    easy = 7.5 * 60;
    moderate = 6 * 60;
  } else if (name.includes('cycl') || name.includes('bike')) {
    easy = 5 * 60;
    moderate = 3 * 60;
  } else {
    easy = 14 * 60;
    moderate = 10 * 60;
  }
  if (paceSecondsPerKm > easy) return { label: 'Easy', emoji: '😊' };
  if (paceSecondsPerKm > moderate) return { label: 'Moderate', emoji: '😐' };
  return { label: 'Hard', emoji: '😤' };
}

export function truncateDescription(
  text: string,
  maxLength: number = 120,
): { text: string; isTruncated: boolean } {
  if (text.length <= maxLength) {
    return { text, isTruncated: false };
  }

  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const finalText = lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';

  return { text: finalText, isTruncated: true };
}

// ============ HOOKS ============

export function useImageGallery() {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setGalleryVisible(true);
  };

  return {
    expandedImage,
    setExpandedImage,
    galleryVisible,
    setGalleryVisible,
    galleryIndex,
    openGallery,
  };
}

// ============ STYLES ============

export const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  headerUserBlock: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTextBlock: { flex: 1, marginLeft: spacing.sm },
  headerName: { fontSize: fontSize.md, fontWeight: '600' },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  headerTime: { fontSize: fontSize.xs },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 3,
  },
  typeBadgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  visibilityPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  visibilityPillText: { fontSize: fontSize.xs },
  menuButton: { padding: spacing.sm },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.xl },
  actionButtonShare: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  actionText: { marginLeft: spacing.xs, fontSize: fontSize.sm },
  bodyPadding: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  bodyTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.xs },
  expandableText: { fontSize: fontSize.md, lineHeight: 22 },
  expandableToggle: { fontSize: fontSize.sm, fontWeight: '600', marginTop: spacing.xs },
  heroMediaContainer: { marginTop: spacing.md, overflow: 'hidden' },
  supplementaryMediaContainer: { marginTop: spacing.md, overflow: 'hidden' },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
    minHeight: 32,
  },
  badgeText: { fontSize: fontSize.sm },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  infoBox: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  ctaButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
  fullBleedMedia: { marginHorizontal: -spacing.lg, marginTop: spacing.sm },
  showMoreLink: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 4,
    width: 40,
    borderTopLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.md,
    zIndex: 1,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  typeLabel: {
    fontSize: msFont(11),
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
