import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {Image} from 'expo-image';
import {Ionicons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useViewability} from '../hooks/useViewability';

interface AutoDisplayImageProps {
  imageUrl: string;
  onExpand?: () => void;
  previewHeight?: number;
}

/**
 * AutoDisplayImage - Memory-safe image component for feeds.
 *
 * Uses expo-image (Glide on Android) for automatic memory management:
 * - LRU memory/disk cache with automatic eviction
 * - Decodes images at display size (not full resolution)
 * - Lazy loading: only renders when visible on screen
 */
export function AutoDisplayImage({
  imageUrl,
  onExpand,
  previewHeight = 300,
}: AutoDisplayImageProps) {
  const { viewRef, isViewable } = useViewability({ threshold: 5, delay: 150 });

  // Placeholder when not visible - no Image loaded, minimal memory
  if (!isViewable) {
    return (
      <View ref={viewRef} style={[styles.container, { height: previewHeight }]} />
    );
  }

  return (
    <View ref={viewRef} style={[styles.container, { height: previewHeight }]}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        contentFit="cover"
        recyclingKey={imageUrl}
        cachePolicy="memory-disk"
      />

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)']}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />

      {onExpand && (
        <View style={styles.overlay} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.expandButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
            onPress={onExpand}
            activeOpacity={0.8}
          >
            <Ionicons name="expand" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  expandButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});