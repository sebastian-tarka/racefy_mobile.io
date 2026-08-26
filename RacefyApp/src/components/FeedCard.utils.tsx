import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, fontSize, spacing, msFont } from '../theme';
import { fixStorageUrl } from '../config/api';
import type { UnitSystem } from '../utils/unitConversions';
import {
  formatDistance as ucFormatDistance,
  formatPaceWithUnit as ucFormatPaceWithUnit,
} from '../utils/unitConversions';
import type { Activity, Post } from '../types/api';

// Re-export from canonical locations for backwards compatibility
export { formatDuration } from '../utils/formatDuration';
export { formatDurationCompact } from '../utils/formatDuration';
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
  url: string;
  thumbnailUrl?: string | null;
  aspectRatio?: number; // width/height from API
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

export function getTypeColors(type: FeedPostType, colors: any) {
  const colorMap: Record<FeedPostType, string> = {
    general: colors.primary,
    activity: colors.primary,
    event: colors.info,
    sponsored: colors.warning,
    reshare: '#06b6d4',
    achievement: '#EAB308',
    challenge: '#F59E0B', // amber-500
    digest: '#10B981', // emerald-500
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
  const videos: PostMediaItem[] = (post.videos || []).map((v) => ({
    id: v.id,
    type: 'video' as const,
    url: fixStorageUrl(v.url) || '',
    thumbnailUrl: v.thumbnail_url ? fixStorageUrl(v.thumbnail_url) : null,
    aspectRatio: v.width && v.height ? v.width / v.height : undefined,
  }));

  const photos: PostMediaItem[] = (post.photos || []).map((p) => ({
    id: p.id,
    type: 'image' as const,
    url: fixStorageUrl(p.url) || '',
  }));

  const media: PostMediaItem[] = (post.media || []).map((m) => {
    const isVideo =
      m.mime_type?.startsWith('video/') || m.url?.toLowerCase().match(/\.(mp4|mov|webm)(\?|$)/);
    return {
      id: m.id,
      type: (isVideo ? 'video' : 'image') as 'video' | 'image',
      url: fixStorageUrl(m.url) || '',
      thumbnailUrl: m.thumbnail_url ? fixStorageUrl(m.thumbnail_url) : null,
      aspectRatio:
        (m as any).width && (m as any).height ? (m as any).width / (m as any).height : undefined,
    };
  });

  return [...videos, ...photos, ...media];
}

export function formatDistance(meters: number, units: UnitSystem = 'metric'): string {
  return ucFormatDistance(meters, units);
}

export function formatPace(meters: number, seconds: number, units: UnitSystem = 'metric'): string {
  if (meters === 0) return '-';
  return ucFormatPaceWithUnit(meters, seconds, units);
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

export function getHeroStat(activity: Activity): 'distance' | 'duration' | 'elevation' {
  const name = (activity.sport_type?.name || '').toLowerCase();
  if (activity.elevation_gain && activity.elevation_gain > 200) return 'elevation';
  if (name.includes('cycl') || name.includes('bike')) return 'duration';
  return 'distance';
}

export function getTimeOfDay(timestamp: string): 'morning' | 'afternoon' | 'evening' {
  const date = new Date(timestamp);
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
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
