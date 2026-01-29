import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AutoPlayVideo } from './AutoPlayVideo';
import { AutoDisplayImage } from './AutoDisplayImage';
import { ImageViewer } from './ImageViewer';
import { ImageGallery } from './ImageGallery';
import { useTheme } from '../hooks/useTheme';
import type { Post } from '../types/api';
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

export function ExpandableContent({ text, type }: { text: string; type: FeedPostType }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const rules = TEXT_TRUNCATION[type];
  const { truncated, isTruncated } = truncateText(text, rules.maxLength, rules.maxSentences);
  const typeColors = getTypeColors(type, colors);

  return (
    <View>
      <Text style={[styles.expandableText, { color: colors.textPrimary }]}>{expanded ? text : truncated}</Text>
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
  const items = buildMediaItems(post);
  if (items.length === 0) return null;

  const imageUrls = items.filter(item => item.type === 'image').map(item => item.url);

  if (heroMode) {
    const hero = items[0];
    const rest = items.slice(1);

    return (
      <View>
        {hero.type === 'video' ? (
          <AutoPlayVideo key={`post-${post.id}-video-${hero.id}`} videoUrl={hero.url} thumbnailUrl={hero.thumbnailUrl} aspectRatio={16 / 9} />
        ) : (
          <View style={styles.heroMediaContainer}>
            <AutoDisplayImage
              imageUrl={hero.thumbnailUrl || hero.url}
              onExpand={() => imageUrls.length > 1 ? openGallery(0) : setExpandedImage(hero.thumbnailUrl || hero.url)}
              previewHeight={300}
            />
          </View>
        )}

        {rest.length > 0 && (
          <View style={styles.mediaGrid}>
            {rest.map((item, i) => {
              const imageIndex = items.slice(0, i + 2).filter(it => it.type === 'image').length - 1;
              return <MediaGridItem key={item.id} item={item} index={i} onPress={() => item.type === 'image' && openGallery(imageIndex)} />;
            })}
          </View>
        )}

        <ImageIndicator count={imageUrls.length} />
        <GalleryModals {...{ galleryVisible, setGalleryVisible, galleryIndex, imageUrls, expandedImage, setExpandedImage }} />
      </View>
    );
  }

  // Non-hero mode
  if (items.length === 1) {
    const item = items[0];
    if (item.type === 'video') {
      return <AutoPlayVideo key={`post-${post.id}-video-${item.id}`} videoUrl={item.url} thumbnailUrl={item.thumbnailUrl} aspectRatio={16 / 9} />;
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
        <GalleryModals {...{ galleryVisible, setGalleryVisible, galleryIndex, imageUrls, expandedImage, setExpandedImage }} />
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
          return <MediaGridItem key={item.id} item={item} index={i} onPress={() => item.type === 'image' && imageUrls.length > 0 && openGallery(imageIndex)} />;
        })}
        {remaining > 0 && (
          <TouchableOpacity style={styles.mediaGridItem} activeOpacity={0.9} onPress={() => imageUrls.length > 0 && openGallery(Math.min(3, imageUrls.length - 1))}>
            <View style={[styles.mediaGridImage, styles.moreBadge]}>
              <Text style={styles.moreBadgeText}>+{remaining}</Text>
            </View>
          </TouchableOpacity>
        )}
        <ImageIndicator count={imageUrls.length} />
      </View>
      <GalleryModals {...{ galleryVisible, setGalleryVisible, galleryIndex, imageUrls, expandedImage, setExpandedImage }} />
    </>
  );
}