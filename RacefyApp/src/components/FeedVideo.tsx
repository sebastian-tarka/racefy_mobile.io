import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useViewability } from '../hooks/useViewability';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const MAX_VIDEO_HEIGHT = screenHeight * 0.7;

interface FeedVideoProps {
  videoUrl: string;
  thumbnailUrl?: string | null;
  aspectRatio?: number;
  previewHeight?: number;
  onScroll?: () => void;
  onExpand?: () => void;
}

// Lazy import to avoid loading expo-video for thumbnails
let AutoPlayVideoComponent: React.ComponentType<FeedVideoProps> | null = null;
function getAutoPlayVideo() {
  if (!AutoPlayVideoComponent) {
    AutoPlayVideoComponent = require('./AutoPlayVideo').AutoPlayVideo;
  }
  return AutoPlayVideoComponent!;
}

/**
 * FeedVideo - Memory-safe wrapper for AutoPlayVideo.
 *
 * Only mounts the actual video player (with native memory allocation)
 * when the component is visible on screen. Off-screen items show a
 * lightweight thumbnail placeholder instead.
 *
 * This prevents OutOfMemoryError on Android by ensuring only 1-2 native
 * video players exist at any time, instead of one per video in the feed.
 */
export function FeedVideo(props: FeedVideoProps) {
  const { aspectRatio = 16 / 9, thumbnailUrl, previewHeight } = props;
  const { viewRef, isViewable } = useViewability({ threshold: 85, delay: 100 });

  const isPortrait = aspectRatio < 1;
  const rawHeight = screenWidth / aspectRatio;
  const displayHeight = Math.min(rawHeight, MAX_VIDEO_HEIGHT);

  if (!isViewable) {
    return (
      <View ref={viewRef} style={[styles.placeholder, { height: displayHeight }]}>
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnail}
            contentFit={isPortrait ? 'contain' : 'cover'}
            cachePolicy="memory-disk"
          />
        ) : null}
        <View style={styles.playOverlay}>
          <View style={styles.playIconCircle}>
            <Ionicons name="play" size={24} color="#FFFFFF" />
          </View>
        </View>
      </View>
    );
  }

  const AutoPlayVideo = getAutoPlayVideo();
  return <AutoPlayVideo {...props} />;
}

const styles = StyleSheet.create({
  placeholder: {
    width: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 3,
  },
});