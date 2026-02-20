import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme';
import { fixStorageUrl } from '../config/api';
import type { UnitSystem } from '../utils/unitConversions';
import {
  formatDistance as ucFormatDistance,
  formatPaceWithUnit as ucFormatPaceWithUnit,
} from '../utils/unitConversions';
import type { Post, Activity } from '../types/api';

// ============ TYPES & INTERFACES ============

export type FeedPostType = 'general' | 'activity' | 'event' | 'sponsored';

export interface PostMediaItem {
  id: number;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string | null;
}

export interface FeedCardProps {
  post: Post;
  isOwner?: boolean;
  onUserPress?: () => void;
  onLike?: () => void;
  onBoost?: () => void;
  onComment?: () => void;
  onShareActivity?: () => void;
  onActivityPress?: () => void;
  onEventPress?: () => void;
  onMenu?: (action: 'edit' | 'delete' | 'report') => void;
}

// ============ CONSTANTS ============

export const TEXT_TRUNCATION: Record<FeedPostType, { maxLength: number; maxSentences: number }> = {
  general: { maxLength: 200, maxSentences: 2 },
  activity: { maxLength: 100, maxSentences: 2 },
  event: { maxLength: 200, maxSentences: 2 },
  sponsored: { maxLength: 200, maxSentences: 2 },
};

// ============ UTILITY FUNCTIONS ============

export function getEffectiveType(post: Post): FeedPostType {
  if ((post as any).is_sponsored) return 'sponsored';
  if (post.type === 'activity') return 'activity';
  if (post.type === 'event') return 'event';
  return 'general';
}

export function getTypeColors(type: FeedPostType, colors: any) {
  const colorMap = {
    general: colors.primary,
    activity: colors.primary,
    event: colors.info,
    sponsored: colors.warning,
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
  };
  return iconMap[type];
}

export function truncateText(text: string, maxLength: number, maxSentences: number): { truncated: string; isTruncated: boolean } {
  if (text.length <= maxLength) return { truncated: text, isTruncated: false };
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  let truncated = '';
  for (let i = 0; i < Math.min(sentences.length, maxSentences); i++) {
    truncated += sentences[i] + (sentences[i + 1] ? (text.match(/[.!?]/)?.[0] || '.') : '');
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

  return [...videos, ...photos, ...media];
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function formatDistance(meters: number, units: UnitSystem = 'metric'): string {
  return ucFormatDistance(meters, units);
}

export function formatPace(meters: number, seconds: number, units: UnitSystem = 'metric'): string {
  if (meters === 0) return '-';
  return ucFormatPaceWithUnit(meters, seconds, units);
}

export function getEffortLevel(sportName: string | undefined, meters: number, seconds: number): { label: string; emoji: string } | null {
  if (meters === 0 || seconds === 0) return null;
  const paceSecondsPerKm = (seconds / meters) * 1000;
  const name = (sportName || '').toLowerCase();
  let easy: number, moderate: number;
  if (name.includes('run')) { easy = 7.5 * 60; moderate = 6 * 60; }
  else if (name.includes('cycl') || name.includes('bike')) { easy = 5 * 60; moderate = 3 * 60; }
  else { easy = 14 * 60; moderate = 10 * 60; }
  if (paceSecondsPerKm > easy) return { label: 'Easy', emoji: '😊' };
  if (paceSecondsPerKm > moderate) return { label: 'Moderate', emoji: '😐' };
  return { label: 'Hard', emoji: '😤' };
}

export function getSportIcon(sportName?: string): keyof typeof Ionicons.glyphMap {
  const name = (sportName || '').toLowerCase();
  if (name.includes('run')) return 'walk-outline';
  if (name.includes('cycl') || name.includes('bike')) return 'bicycle-outline';
  if (name.includes('swim')) return 'water-outline';
  if (name.includes('gym') || name.includes('fitness')) return 'barbell-outline';
  if (name.includes('yoga')) return 'body-outline';
  return 'fitness-outline';
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
  maxLength: number = 120
): { text: string; isTruncated: boolean } {
  if (text.length <= maxLength) {
    return { text, isTruncated: false };
  }

  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const finalText = lastSpace > 0
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';

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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  headerUserBlock: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerSponsoredIcon: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sponsoredCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  headerTextBlock: { flex: 1, marginLeft: spacing.sm },
  headerName: { fontSize: fontSize.md, fontWeight: '600' },
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 },
  headerTime: { fontSize: fontSize.xs },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm, gap: 3 },
  typeBadgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  visibilityPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  visibilityPillText: { fontSize: fontSize.xs },
  menuContainer: { position: 'relative' },
  menuButton: { padding: spacing.sm },
  menuDropdown: { position: 'absolute', top: 32, right: 0, borderRadius: borderRadius.md, borderWidth: 1, minWidth: 140, zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  menuItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  menuItemText: { fontSize: fontSize.sm },
  actionsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, marginTop: spacing.sm },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.xl },
  actionButtonShare: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  actionText: { marginLeft: spacing.xs, fontSize: fontSize.sm },
  bodyPadding: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  bodyTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.xs },
  expandableText: { fontSize: fontSize.md, lineHeight: 22 },
  expandableToggle: { fontSize: fontSize.sm, fontWeight: '600', marginTop: spacing.xs },
  heroMediaContainer: { marginTop: spacing.md, overflow: 'hidden' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs },
  mediaGridItem: { width: '50%', height: 120, position: 'relative' },
  mediaGridImage: { width: '100%', height: '100%' },
  supplementaryMediaContainer: { marginTop: spacing.md, overflow: 'hidden' },
  playOverlaySmall: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  moreBadge: { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  moreBadgeText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, gap: 4, minHeight: 32 },
  badgeSecondary: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, borderWidth: 1, gap: 4, minHeight: 32 },
  badgeText: { fontSize: fontSize.sm },
  heroVisual: { marginTop: spacing.md, height: 160, borderRadius: borderRadius.md, overflow: 'hidden', position: 'relative' },
  heroVisualContainer: { marginTop: spacing.md, borderRadius: borderRadius.md, overflow: 'hidden' },
  heroVisualOverlay: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  secondaryStrip: { marginTop: spacing.sm, flexDirection: 'row' },
  secondaryThumb: { width: 80, height: 80, marginRight: spacing.xs, borderRadius: borderRadius.sm, overflow: 'hidden', position: 'relative' },
  secondaryThumbImage: { width: '100%', height: '100%' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  heroStatCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, gap: 2 },
  heroStatValue: { fontSize: fontSize.md, fontWeight: '700' },
  heroStatLabel: { fontSize: fontSize.xs },
  secondaryStatBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, borderWidth: 1, gap: 4 },
  secondaryStatText: { fontSize: fontSize.sm },
  infoBox: { marginTop: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.md },
  infoBoxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  infoBoxText: { fontSize: fontSize.sm, flex: 1 },
  infoBoxLink: { marginLeft: 'auto' },
  infoBoxLinkText: { fontSize: fontSize.sm, fontWeight: '600' },
  ctaButton: { marginTop: spacing.md, borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center' },
  ctaButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
  imageIndicator: { position: 'absolute', top: spacing.sm, left: spacing.sm, zIndex: 5 },
  imageIndicatorBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', gap: 4 },
  imageIndicatorText: { flexDirection: 'row', alignItems: 'center' },
  fullBleedMedia: { marginHorizontal: -spacing.lg },
  viewDetailsButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  showMoreLink: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  tagPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
    minHeight: 28,
  },
  statsRowNew: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
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
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});