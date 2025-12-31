import React, { useState, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { VideoPlayer } from './VideoPlayer';
import { fixStorageUrl } from '../config/api';
import { spacing, borderRadius } from '../theme';
import type { Media, Photo, Video } from '../types/api';

interface MediaGalleryProps {
  media?: Media[];
  photos?: Photo[];
  videos?: Video[];
  width?: number;
}

const { width: screenWidth } = Dimensions.get('window');
const DEFAULT_WIDTH = screenWidth - spacing.lg * 4;

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

  // Debug: Log incoming props
  console.log('[MediaGallery] Props received:', {
    mediaCount: media.length,
    photosCount: photos.length,
    videosCount: videos.length,
    videos: videos,
  });

  // Helper to detect media type from URL or mime_type
  const detectMediaType = (item: { url?: string; mime_type?: string; type?: string }): 'image' | 'video' => {
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
  };

  // Combine media, photos, and videos into a unified list
  const items: Array<{
    id: number;
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string | null;
  }> = [
    ...media.map((m) => {
      const detectedType = detectMediaType(m);
      console.log('[MediaGallery] Media item type detection:', {
        id: m.id,
        originalType: m.type,
        mimeType: m.mime_type,
        url: m.url,
        detectedType
      });
      return {
        id: m.id,
        type: detectedType,
        url: fixStorageUrl(m.url) || '',
        thumbnailUrl: m.thumbnail_url ? fixStorageUrl(m.thumbnail_url) : null,
      };
    }),
    ...photos.map((p) => ({
      id: p.id,
      type: 'image' as const,
      url: fixStorageUrl(p.url) || '',
      thumbnailUrl: null,
    })),
    ...videos.map((v) => {
      const fixedUrl = fixStorageUrl(v.url);
      const fixedThumbnail = v.thumbnail_url ? fixStorageUrl(v.thumbnail_url) : null;
      console.log('[MediaGallery] Video URL transform:', {
        original: v.url,
        fixed: fixedUrl,
        thumbnailOriginal: v.thumbnail_url,
        thumbnailFixed: fixedThumbnail,
      });
      return {
        id: v.id,
        type: 'video' as const,
        url: fixedUrl || '',
        thumbnailUrl: fixedThumbnail,
      };
    }),
  ];

  console.log('[MediaGallery] Final items:', items);

  if (items.length === 0) return null;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  const handleItemPress = (item: typeof items[0]) => {
    if (item.type === 'video') {
      setSelectedVideoUri(item.url);
      setSelectedVideoThumbnail(item.thumbnailUrl || null);
      setVideoPlayerVisible(true);
    } else {
      setSelectedImageUri(item.url);
      setImageViewerVisible(true);
    }
  };

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
          <Image
            source={{ uri: item.thumbnailUrl || item.url }}
            style={styles.singleImage}
            resizeMode="cover"
          />
          {item.type === 'video' && (
            <View style={styles.playIconOverlay}>
              <View style={styles.playIconContainer}>
                <Ionicons name="play" size={32} color="#FFFFFF" />
              </View>
            </View>
          )}
        </TouchableOpacity>

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
                resizeMode="contain"
              />
            </View>
          </Modal>
        )}
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
              <Image
                source={{ uri: item.thumbnailUrl || item.url }}
                style={styles.image}
                resizeMode="cover"
              />
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
                      index === currentIndex
                        ? colors.primary
                        : 'rgba(255,255,255,0.5)',
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>

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
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    position: 'relative',
  },
  singleContainer: {
    height: 200,
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
    height: 200,
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
