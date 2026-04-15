import React from 'react';
import {Linking, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useTheme} from '../hooks/useTheme';
import {ExpandableContent, PostMedia} from './FeedCard.Media';
import {styles} from './FeedCard.utils';
import {borderRadius, fontSize, spacing} from '../theme';
import type {Post} from '../types/api';

export function SponsoredBody({ post }: { post: Post }) {
  const { colors } = useTheme();
  const hasMedia = (post.videos?.length ?? 0) > 0 || (post.photos?.length ?? 0) > 0 || (post.media?.length ?? 0) > 0;
  const sponsoredData = post.sponsored_data;
  const ctaText = sponsoredData?.cta_text;
  const ctaUrl = sponsoredData?.promoted_link || sponsoredData?.cta_url;

  const accentColor = sponsoredData?.accent_color || post.accent_color || '#f59e0b';

  return (
    <>
      {/* Full-bleed hero media */}
      {hasMedia ? (
        <View style={styles.fullBleedMedia}>
          <PostMedia post={post} heroMode />
        </View>
      ) : null}

      {/* Title + content */}
      <View style={styles.bodyPadding}>
        {post.title && (
          <Text style={[spStyles.productTitle, { color: colors.textPrimary }]}>{post.title}</Text>
        )}
        {post.content && <ExpandableContent text={post.content} type="sponsored" mentions={post.mentions} />}
      </View>

      {/* CTA button — full width, prominent */}
      {ctaUrl && ctaText && (
        <View style={spStyles.ctaContainer}>
          <TouchableOpacity
            style={[spStyles.ctaButton, { backgroundColor: accentColor }]}
            activeOpacity={0.8}
            onPress={() => void Linking.openURL(ctaUrl)}
          >
            <Text style={spStyles.ctaText}>{ctaText}</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const spStyles = StyleSheet.create({
  productTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  ctaContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  ctaButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});