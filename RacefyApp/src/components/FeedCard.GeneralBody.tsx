import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { ExpandableContent, PostMedia } from './FeedCard.Media';
import { SharedPostBlock } from './SharedPostBlock';
import { SharedPostDeletedBlock } from './SharedPostDeletedBlock';
import { YouTubeEmbed } from './YouTubeEmbed';
import { styles } from './FeedCard.utils';
import { spacing, borderRadius, fontSize } from '../theme';
import type { Post, TaggedEvent } from '../types/api';

const TAG_EVENT_COLORS: Record<string, { accent: string; bg: string; border: string }> = {
  challenge: { accent: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  digest: { accent: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  milestone: { accent: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)' },
};

function TaggedEventBlock({ taggedEvent, postType, onPress }: { taggedEvent: TaggedEvent; postType: string; onPress?: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const tc = TAG_EVENT_COLORS[postType] || TAG_EVENT_COLORS.challenge;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View style={[styles.bodyPadding, { paddingTop: spacing.md }]}>
      <View style={{ backgroundColor: tc.bg, borderColor: tc.border, borderWidth: 1, borderRadius: borderRadius.md, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: tc.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons name="calendar-outline" size={14} color={tc.accent} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: tc.accent, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {taggedEvent.sport_type || t('feed.postTypes.event', 'Event')}
            </Text>
          </View>
          {taggedEvent.status && (
            <Text style={{ fontSize: 10, fontWeight: '600', color: tc.accent }}>
              {taggedEvent.status}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md }}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary }} numberOfLines={1}>
              {taggedEvent.name}
            </Text>
            {taggedEvent.starts_at && (
              <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                {formatDate(taggedEvent.starts_at)}
                {taggedEvent.ends_at ? ` — ${formatDate(taggedEvent.ends_at)}` : ''}
              </Text>
            )}
          </View>
          {onPress && (
            <TouchableOpacity
              onPress={onPress}
              style={{ backgroundColor: tc.accent, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md }}
            >
              <Text style={{ color: '#fff', fontSize: fontSize.xs, fontWeight: '700' }}>
                {t('feed.viewDetails', 'View Event')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

interface GeneralBodyProps {
  post: Post;
  onEventPress?: () => void;
  onOriginalPostPress?: () => void;
  onOriginalPostUserPress?: (username: string) => void;
}

export function GeneralBody({ post, onEventPress, onOriginalPostPress, onOriginalPostUserPress }: GeneralBodyProps) {
  const { colors } = useTheme();
  const postVideos = post.videos || [];
  const postPhotos = post.photos || [];
  const postMedia = post.media || [];
  const hasMedia = postVideos.length > 0 || postPhotos.length > 0 || postMedia.length > 0;

  const sharedPostContent = () => {
    if (post.shared_post_deleted && !post.shared_post) {
      return (
        <View style={styles.bodyPadding}>
          <SharedPostDeletedBlock />
        </View>
      );
    }
    if (post.shared_post) {
      return (
        <View style={styles.bodyPadding}>
          <SharedPostBlock
            sharedPost={post.shared_post}
            onPress={onOriginalPostPress}
            onUserPress={onOriginalPostUserPress}
          />
        </View>
      );
    }
    return null;
  };

  if (!hasMedia) {
    // No media - everything with padding
    return (
      <>
        <View style={styles.bodyPadding}>
          {post.title && <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>}
          {post.content && <ExpandableContent text={post.content} type="general" mentions={post.mentions} />}
        </View>
        {post.youtube_embed_id && (
          <View style={[styles.fullBleedMedia, { marginTop: 8 }]}>
            <YouTubeEmbed embedId={post.youtube_embed_id} />
          </View>
        )}
        {sharedPostContent()}
        {post.tagged_event && (
          <TaggedEventBlock taggedEvent={post.tagged_event} postType={post.type} onPress={onEventPress} />
        )}
      </>
    );
  }

  // Has media - title/content with padding, media full-bleed
  return (
    <>
      {(post.title || post.content) && (
        <View style={styles.bodyPadding}>
          {post.title && <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>}
          {post.content && <ExpandableContent text={post.content} type="general" mentions={post.mentions} />}
        </View>
      )}
      {post.youtube_embed_id && (
        <View style={[styles.fullBleedMedia, { marginTop: 8 }]}>
          <YouTubeEmbed embedId={post.youtube_embed_id} />
        </View>
      )}
      <View style={styles.fullBleedMedia}>
        <PostMedia post={post} heroMode />
      </View>
      {sharedPostContent()}
      {post.tagged_event && (
        <TaggedEventBlock taggedEvent={post.tagged_event} postType={post.type} onPress={onEventPress} />
      )}
    </>
  );
}