import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ExpandableContent, PostMedia } from './FeedCard.Media';
import { SharedPostBlock } from './SharedPostBlock';
import { SharedPostDeletedBlock } from './SharedPostDeletedBlock';
import { styles } from './FeedCard.utils';
import type { Post } from '../types/api';

interface GeneralBodyProps {
  post: Post;
  onOriginalPostPress?: () => void;
  onOriginalPostUserPress?: (username: string) => void;
}

export function GeneralBody({ post, onOriginalPostPress, onOriginalPostUserPress }: GeneralBodyProps) {
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
        {sharedPostContent()}
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
      <View style={styles.fullBleedMedia}>
        <PostMedia post={post} heroMode />
      </View>
      {sharedPostContent()}
    </>
  );
}