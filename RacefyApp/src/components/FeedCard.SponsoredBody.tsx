import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ExpandableContent, PostMedia } from './FeedCard.Media';
import { styles } from './FeedCard.utils';
import type { Post } from '../types/api';

export function SponsoredBody({ post }: { post: Post }) {
  const { colors } = useTheme();
  const hasMedia = (post.videos?.length ?? 0) > 0 || (post.photos?.length ?? 0) > 0 || (post.media?.length ?? 0) > 0;

  return (
    <>
      {/* Title and media in full-bleed for product-first layout */}
      {hasMedia ? (
        <>
          {post.title && (
            <View style={styles.bodyPadding}>
              <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>
            </View>
          )}
          {/* Full-bleed media - negative margin offsets Card's padding */}
          <View style={styles.fullBleedMedia}>
            <PostMedia post={post} heroMode />
          </View>
        </>
      ) : (
        <View style={styles.bodyPadding}>
          {post.title && <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>}
        </View>
      )}

      {/* Content and CTA with padding */}
      <View style={styles.bodyPadding}>
        {post.content && <ExpandableContent text={post.content} type="sponsored" mentions={post.mentions} />}
        {(post as any).sponsored_data?.cta_url && (post as any).sponsored_data?.cta_text && (
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
    </>
  );
}