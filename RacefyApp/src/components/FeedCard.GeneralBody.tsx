import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ExpandableContent, PostMedia } from './FeedCard.Media';
import { styles } from './FeedCard.utils';
import type { Post } from '../types/api';

export function GeneralBody({ post }: { post: Post }) {
  const { colors } = useTheme();
  const postVideos = post.videos || [];
  const postPhotos = post.photos || [];
  const postMedia = post.media || [];
  const hasMedia = postVideos.length > 0 || postPhotos.length > 0 || postMedia.length > 0;

  if (!hasMedia) {
    // No media - everything with padding
    return (
      <View style={styles.bodyPadding}>
        {post.title && <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>}
        {post.content && <ExpandableContent text={post.content} type="general" />}
      </View>
    );
  }

  // Has media - title/content with padding, media full-bleed
  return (
    <>
      {(post.title || post.content) && (
        <View style={styles.bodyPadding}>
          {post.title && <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>}
          {post.content && <ExpandableContent text={post.content} type="general" />}
        </View>
      )}
      <View style={styles.fullBleedMedia}>
        <PostMedia post={post} heroMode />
      </View>
    </>
  );
}