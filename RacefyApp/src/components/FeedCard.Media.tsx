import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AutoPlayVideo } from './AutoPlayVideo';
import { AutoDisplayImage } from './AutoDisplayImage';
import { ImageViewer } from './ImageViewer';
import { ImageGallery } from './ImageGallery';
import { VideoPlayer } from './VideoPlayer';
import { MediaSlider } from './MediaSlider';
import { useTheme } from '../hooks/useTheme';
import type { Post, MentionMap } from '../types/api';
import { MentionText } from './MentionText';
import {
  type FeedPostType,
  type PostMediaItem,
  TEXT_TRUNCATION,
  truncateText,
  getTypeColors,
  buildMediaItems,
  useImageGallery,
  styles,
} from './FeedCard.utils';

export function ExpandableContent({ text, type, mentions }: { text: string; type: FeedPostType; mentions?: MentionMap }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const rules = TEXT_TRUNCATION[type];
  const { truncated, isTruncated } = truncateText(text, rules.maxLength, rules.maxSentences);
  const typeColors = getTypeColors(type, colors);

  const displayText = expanded ? text : truncated;

  return (
    <View>
      {mentions ? (
        <MentionText text={displayText} mentions={mentions} style={[styles.expandableText, { color: colors.textPrimary }]} />
      ) : (
        <Text style={[styles.expandableText, { color: colors.textPrimary }]}>{displayText}</Text>
      )}
      {isTruncated && !expanded && (
        <TouchableOpacity onPress={() => setExpanded(true)}>
          <Text style={[styles.expandableToggle, { color: typeColors.expand }]}>{t('feed.showMore')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function MediaGridItem({ item, index, onPress }: { item: PostMediaItem; index: number; onPress: () => void }) {
  return (
    <TouchableOpacity key={item.id + '-' + index} style={styles.mediaGridItem} activeOpacity={0.9} onPress={onPress}>
      <Image source={{ uri: item.thumbnailUrl || item.url }} style={styles.mediaGridImage} resizeMode="cover" />
      {item.type === 'video' && (
        <View style={styles.playOverlaySmall}>
          <Ionicons name="play" size={16} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

function ImageIndicator({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
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
  );
}

function GalleryModals({ galleryVisible, setGalleryVisible, galleryIndex, imageUrls, expandedImage, setExpandedImage }: any) {
  return (
    <>
      {galleryVisible && imageUrls.length > 0 && (
        <ImageGallery images={imageUrls} initialIndex={galleryIndex} visible={galleryVisible} onClose={() => setGalleryVisible(false)} />
      )}
      {expandedImage && (
        <ImageViewer uri={expandedImage} visible={true} onClose={() => setExpandedImage(null)} />
      )}
    </>
  );
}

export function PostMedia({ post, heroMode = true }: { post: Post; heroMode?: boolean }) {
  const { expandedImage, setExpandedImage, galleryVisible, setGalleryVisible, galleryIndex, openGallery } = useImageGallery();
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const items = buildMediaItems(post);
  if (items.length === 0) return null;

  const imageUrls = items.filter(item => item.type === 'image').map(item => item.url);

  // Use slider for multiple media items
  if (items.length > 1) {
    return (
      <View>
        <MediaSlider
          items={items}
          onImagePress={(index) => {
            // Find the corresponding image index (excluding videos)
            const imageIndex = items.slice(0, index + 1).filter(it => it.type === 'image').length - 1;
            if (imageIndex >= 0) {
              imageUrls.length > 1 ? openGallery(imageIndex) : setExpandedImage(items[index].url);
            }
          }}
          onVideoPress={(index) => setExpandedVideo(items[index].url)}
          aspectRatio={16 / 9}
          previewHeight={300}
        />
        <GalleryModals {...{ galleryVisible, setGalleryVisible, galleryIndex, imageUrls, expandedImage, setExpandedImage }} />
        {expandedVideo && (
          <VideoPlayer uri={expandedVideo} visible={true} onClose={() => setExpandedVideo(null)} />
        )}
      </View>
    );
  }

  // Single media item
  const item = items[0];
  if (item.type === 'video') {
    return (
      <View>
        <AutoPlayVideo key={`post-${post.id}-video-${item.id}`} videoUrl={item.url} thumbnailUrl={item.thumbnailUrl} aspectRatio={16 / 9} previewHeight={300} onExpand={() => setExpandedVideo(item.url)} />
        {expandedVideo && (
          <VideoPlayer uri={expandedVideo} visible={true} onClose={() => setExpandedVideo(null)} />
        )}
      </View>
    );
  }

  return (
    <>
      <View style={heroMode ? styles.heroMediaContainer : styles.supplementaryMediaContainer}>
        <AutoDisplayImage
          imageUrl={item.thumbnailUrl || item.url}
          onExpand={() => setExpandedImage(item.thumbnailUrl || item.url)}
          previewHeight={300}
        />
      </View>
      <GalleryModals {...{ galleryVisible, setGalleryVisible, galleryIndex, imageUrls, expandedImage, setExpandedImage }} />
    </>
  );
}