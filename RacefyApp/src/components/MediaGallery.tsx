import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { VideoPlayer } from './VideoPlayer';
import { fixStorageUrl } from '../config/api';
import { spacing } from '../theme';
import type { Media, Photo, Video } from '../types/api';
import { pickFullSizeUrl, pickVariant } from '../utils/imageVariants';

interface MediaGalleryProps {
  media?: Media[];
  photos?: Photo[];
  videos?: Video[];
  width?: number;
}

const { width: screenWidth } = Dimensions.get('window');
const DEFAULT_WIDTH = screenWidth - spacing.lg * 4;

/**
 * Media keeps one shape everywhere instead of a hardcoded 200pt height.
 *
 * The old fixed height meant the same photo was letterboxed differently on every
 * screen size (256x200 on a 320pt phone, 366x200 on a 430pt one) and differently
 * again per call site. 1.55 is the ratio the feed renders today on the 375pt
 * baseline, so the most-seen surface is unchanged.
 */
const MEDIA_ASPECT_RATIO = 1.55;

interface GalleryItem {
  id: number;
  type: 'image' | 'video';
  /** The original: video file, or full-size photo (fallback). */
  url: string;
  /** What the card shows: `large`/`medium` photo variant or the video poster. */
  previewUrl: string | null;
  /** What the full-screen view loads: `xlarge`/`large` photo variant. */
  fullUrl: string | null;
}

// Helper to detect media type from URL or mime_type
function detectMediaType(item: {
  url?: string;
  mime_type?: string;
  type?: string;
}): 'image' | 'video' {
  // If type is already set, use it
  if (item.type === 'video' || item.type === 'image') {
    return item.type;
  }
  // Check mime_type
  if (item.mime_type?.startsWith('video/')) {
    return 'video';
  }
  // Check URL for video extensions
  const url = item.url?.toLowerCase() || '';
  if (url.includes('/videos/') || url.match(/\.(mp4|mov|avi|webm|mkv)(\?|$)/)) {
    return 'video';
  }
  return 'image';
}

function mediaItem(m: Media): GalleryItem {
  const type = detectMediaType(m);
  if (type === 'video') {
    return {
      id: m.id,
      type,
      url: fixStorageUrl(m.url) || '',
      previewUrl: fixStorageUrl(
        pickVariant(m.thumbnail_variants, ['medium', 'small'], m.thumbnail_url),
      ),
      fullUrl: null,
    };
  }
  return {
    id: m.id,
    type,
    url: fixStorageUrl(m.url) || '',
    previewUrl: fixStorageUrl(pickVariant(m.variants, ['large', 'medium'], m.thumbnail_url)),
    fullUrl: fixStorageUrl(pickFullSizeUrl(m.variants, null)),
  };
}

function photoItem(p: Photo): GalleryItem {
  return {
    id: p.id,
    type: 'image',
    url: fixStorageUrl(p.url) || '',
    previewUrl: fixStorageUrl(pickVariant(p.variants, ['large', 'medium'], null)),
    fullUrl: fixStorageUrl(pickFullSizeUrl(p.variants, null)),
  };
}

function videoItem(v: Video): GalleryItem {
  return {
    id: v.id,
    type: 'video',
    url: fixStorageUrl(v.url) || '',
    previewUrl: fixStorageUrl(
      pickVariant(v.thumbnail_variants, ['medium', 'small'], v.thumbnail_url),
    ),
    fullUrl: null,
  };
}

export function MediaGallery({
  media = [],
  photos = [],
  videos = [],
  width = DEFAULT_WIDTH,
}: MediaGalleryProps) {
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const [selectedVideoUri, setSelectedVideoUri] = useState<string | null>(null);
  const [selectedVideoThumbnail, setSelectedVideoThumbnail] = useState<string | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  // Combine media, photos, and videos into a unified list
  const items: GalleryItem[] = [
    ...media.map(mediaItem),
    ...photos.map(photoItem),
    ...videos.map(videoItem),
  ];

  if (items.length === 0) return null;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  const handleItemPress = (item: GalleryItem) => {
    if (item.type === 'video') {
      setSelectedVideoUri(item.url);
      setSelectedVideoThumbnail(item.previewUrl);
      setVideoPlayerVisible(true);
    } else {
      setSelectedImageUri(item.fullUrl || item.url);
      setImageViewerVisible(true);
    }
  };

  const renderPreview = (item: GalleryItem, style: object) => (
    <Image
      source={{ uri: item.previewUrl || item.url }}
      style={style}
      contentFit="cover"
      cachePolicy="memory-disk"
      recyclingKey={item.previewUrl || item.url}
    />
  );

  const modals = (
    <>
      {videoPlayerVisible && selectedVideoUri && (
        <VideoPlayer
          uri={selectedVideoUri}
          visible={videoPlayerVisible}
          onClose={() => {
            setVideoPlayerVisible(false);
            setSelectedVideoUri(null);
            setSelectedVideoThumbnail(null);
          }}
          thumbnailUrl={selectedVideoThumbnail}
        />
      )}

      {imageViewerVisible && selectedImageUri && (
        <Modal visible={imageViewerVisible} transparent animationType="fade">
          <View style={styles.imageViewerContainer}>
            <TouchableOpacity
              style={styles.imageViewerClose}
              onPress={() => {
                setImageViewerVisible(false);
                setSelectedImageUri(null);
              }}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Image
              source={{ uri: selectedImageUri }}
              style={styles.fullImage}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          </View>
        </Modal>
      )}
    </>
  );

  // Single item layout
  if (items.length === 1) {
    const item = items[0];
    return (
      <>
        <TouchableOpacity
          style={[styles.singleContainer, { width }]}
          onPress={() => handleItemPress(item)}
          activeOpacity={0.9}
        >
          {renderPreview(item, styles.singleImage)}
          {item.type === 'video' && (
            <View style={styles.playIconOverlay}>
              <View style={styles.playIconContainer}>
                <Ionicons name="play" size={32} color="#FFFFFF" />
              </View>
            </View>
          )}
        </TouchableOpacity>
        {modals}
      </>
    );
  }

  // Multiple items with horizontal scroll
  return (
    <>
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ width: width * items.length }}
        >
          {items.map((item, index) => (
            <TouchableOpacity
              key={`${item.id}-${index}`}
              style={[styles.itemContainer, { width }]}
              onPress={() => handleItemPress(item)}
              activeOpacity={0.9}
            >
              {renderPreview(item, styles.image)}
              {item.type === 'video' && (
                <View style={styles.playIconOverlay}>
                  <View style={styles.playIconContainer}>
                    <Ionicons name="play" size={32} color="#FFFFFF" />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Pagination dots */}
        {items.length > 1 && (
          <View style={styles.pagination}>
            {items.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === currentIndex ? colors.primary : 'rgba(255,255,255,0.5)',
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>
      {modals}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    position: 'relative',
  },
  singleContainer: {
    aspectRatio: MEDIA_ASPECT_RATIO,
    marginTop: spacing.md,
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  singleImage: {
    width: '100%',
    height: '100%',
  },
  itemContainer: {
    aspectRatio: MEDIA_ASPECT_RATIO,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  pagination: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});
