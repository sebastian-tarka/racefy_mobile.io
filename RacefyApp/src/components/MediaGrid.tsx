import React, {useState} from 'react';
import {Dimensions, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Image} from 'expo-image';
import {FeedVideo} from './FeedVideo';
import {AutoDisplayImage} from './AutoDisplayImage';
import {ImageViewer} from './ImageViewer';
import {ImageGallery} from './ImageGallery';
import {VideoPlayer} from './VideoPlayer';
import {VideoPlayerManager} from '../services/VideoPlayerManager';
import type {PostMediaItem} from './FeedCard.utils';
import {useImageGallery} from './FeedCard.utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 2;

interface MediaGridProps {
  items: PostMediaItem[];
  /** Max items visible before "+N" overlay (default 4) */
  maxVisible?: number;
}

/**
 * Adaptive media grid layout inspired by modern social feeds:
 * 1 item  → full-width hero
 * 2 items → side-by-side (50/50)
 * 3 items → 1 large left (2/3 height) + 2 stacked right (1/3 each)
 * 4 items → 2×2 grid
 * 5+ items → 2×2 grid with "+N" overlay on last cell
 */
export function MediaGrid({ items, maxVisible = 4 }: MediaGridProps) {
  const { expandedImage, setExpandedImage, galleryVisible, setGalleryVisible, galleryIndex, openGallery } = useImageGallery();
  const [expandedVideo, setExpandedVideoRaw] = useState<string | null>(null);

  const setExpandedVideo = (url: string | null) => {
    if (url) VideoPlayerManager.pauseAll();
    setExpandedVideoRaw(url);
  };

  const imageUrls = items.filter(i => i.type === 'image').map(i => i.url);
  const count = items.length;

  const handleItemPress = (index: number) => {
    const item = items[index];
    if (item.type === 'video') {
      setExpandedVideo(item.url);
    } else {
      if (imageUrls.length > 1) {
        const imageIndex = items.slice(0, index + 1).filter(i => i.type === 'image').length - 1;
        openGallery(imageIndex);
      } else {
        setExpandedImage(item.url);
      }
    }
  };

  const renderCell = (item: PostMediaItem, index: number, width: number, height: number, style?: any) => {
    // Video → inline playback with FeedVideo (autoplay, mute, expand to fullscreen)
    // fillContainer makes FeedVideo stretch to fill the cell instead of sizing via aspectRatio
    if (item.type === 'video') {
      return (
        <View key={`${item.id}-${index}`} style={[{ width, height, overflow: 'hidden' }, style]}>
          <FeedVideo
            videoUrl={item.url}
            thumbnailUrl={item.thumbnailUrl}
            fillContainer
            onExpand={() => setExpandedVideo(item.url)}
          />
        </View>
      );
    }

    // Image → thumbnail with tap to gallery
    return (
      <TouchableOpacity
        key={`${item.id}-${index}`}
        style={[{ width, height }, style]}
        activeOpacity={0.85}
        onPress={() => handleItemPress(index)}
      >
        <Image
          source={{ uri: item.thumbnailUrl || item.url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </TouchableOpacity>
    );
  };

  const renderMoreOverlay = (item: PostMediaItem, index: number, width: number, height: number, remaining: number) => {
    return (
      <TouchableOpacity
        key={`${item.id}-${index}`}
        style={[{ width, height, overflow: 'hidden' }]}
        activeOpacity={0.85}
        onPress={() => handleItemPress(index)}
      >
        {item.type === 'video' ? (
          <View style={StyleSheet.absoluteFill}>
            <FeedVideo
              videoUrl={item.url}
              thumbnailUrl={item.thumbnailUrl}
              fillContainer
            />
          </View>
        ) : (
          <Image
            source={{ uri: item.thumbnailUrl || item.url }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        )}
        <View style={gridStyles.moreOverlay} pointerEvents="none">
          <Text style={gridStyles.moreText}>+{remaining}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGrid = () => {
    if (count === 0) return null;

    // Single item → full-width hero (use AutoDisplayImage/FeedVideo for best UX)
    if (count === 1) {
      const item = items[0];
      if (item.type === 'video') {
        return (
          <FeedVideo
            videoUrl={item.url}
            thumbnailUrl={item.thumbnailUrl}
            aspectRatio={item.aspectRatio || 16 / 9}
            onExpand={() => setExpandedVideo(item.url)}
          />
        );
      }
      return (
        <AutoDisplayImage
          imageUrl={item.thumbnailUrl || item.url}
          onExpand={() => setExpandedImage(item.url)}
          previewHeight={300}
        />
      );
    }

    const gridWidth = SCREEN_WIDTH;
    const gridHeight = gridWidth * 0.75; // 4:3 aspect for grid

    // 2 items → side by side
    if (count === 2) {
      const cellW = (gridWidth - GRID_GAP) / 2;
      return (
        <View style={[gridStyles.row, { height: gridHeight }]}>
          {renderCell(items[0], 0, cellW, gridHeight)}
          <View style={{ width: GRID_GAP }} />
          {renderCell(items[1], 1, cellW, gridHeight)}
        </View>
      );
    }

    // 3 items → 1 large left + 2 stacked right
    if (count === 3) {
      const leftW = gridWidth * 0.6;
      const rightW = gridWidth - leftW - GRID_GAP;
      const rightH = (gridHeight - GRID_GAP) / 2;
      return (
        <View style={[gridStyles.row, { height: gridHeight }]}>
          {renderCell(items[0], 0, leftW, gridHeight)}
          <View style={{ width: GRID_GAP }} />
          <View style={{ width: rightW }}>
            {renderCell(items[1], 1, rightW, rightH)}
            <View style={{ height: GRID_GAP }} />
            {renderCell(items[2], 2, rightW, rightH)}
          </View>
        </View>
      );
    }

    // 4+ items → 2×2 grid (with "+N" overlay on last cell if 5+)
    const cellW = (gridWidth - GRID_GAP) / 2;
    const cellH = (gridHeight - GRID_GAP) / 2;
    const remaining = count - maxVisible;
    const showMore = remaining > 0;

    return (
      <View style={{ height: gridHeight }}>
        <View style={gridStyles.row}>
          {renderCell(items[0], 0, cellW, cellH)}
          <View style={{ width: GRID_GAP }} />
          {renderCell(items[1], 1, cellW, cellH)}
        </View>
        <View style={{ height: GRID_GAP }} />
        <View style={gridStyles.row}>
          {renderCell(items[2], 2, cellW, cellH)}
          <View style={{ width: GRID_GAP }} />
          {showMore
            ? renderMoreOverlay(items[3], 3, cellW, cellH, remaining)
            : renderCell(items[3], 3, cellW, cellH)
          }
        </View>
      </View>
    );
  };

  return (
    <View>
      {renderGrid()}

      {/* Modals */}
      {galleryVisible && imageUrls.length > 0 && (
        <ImageGallery
          images={imageUrls}
          initialIndex={galleryIndex}
          visible={galleryVisible}
          onClose={() => setGalleryVisible(false)}
        />
      )}
      {expandedImage && (
        <ImageViewer uri={expandedImage} visible onClose={() => setExpandedImage(null)} />
      )}
      {expandedVideo && (
        <VideoPlayer uri={expandedVideo} visible onClose={() => setExpandedVideo(null)} />
      )}
    </View>
  );
}

const gridStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  moreText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
});