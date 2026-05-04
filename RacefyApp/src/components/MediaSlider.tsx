import React, { useState, useRef } from 'react';
import { View, FlatList, LayoutChangeEvent, StyleSheet, ViewToken } from 'react-native';
import { FeedVideo } from './FeedVideo';
import { AutoDisplayImage } from './AutoDisplayImage';
import type { PostMediaItem } from './FeedCard.utils';

interface MediaSliderProps {
  items: PostMediaItem[];
  onImagePress?: (index: number) => void;
  onVideoPress?: (index: number) => void;
  aspectRatio?: number;
  previewHeight?: number;
}

export function MediaSlider({
  items,
  onImagePress,
  onVideoPress,
  aspectRatio = 16 / 9,
  previewHeight = 300
}: MediaSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onContainerLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== containerWidth) setContainerWidth(w);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  const renderItem = ({ item, index }: { item: PostMediaItem; index: number }) => {
    if (item.type === 'video') {
      return (
        <View style={{ width: containerWidth }}>
          <FeedVideo
            videoUrl={item.url}
            thumbnailUrl={item.thumbnailUrl}
            aspectRatio={item.aspectRatio || aspectRatio}
            onExpand={() => onVideoPress?.(index)}
          />
        </View>
      );
    }

    return (
      <View style={{ width: containerWidth }}>
        <AutoDisplayImage
          imageUrl={item.url}
          onExpand={() => onImagePress?.(index)}
          previewHeight={previewHeight}
        />
      </View>
    );
  };

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      {containerWidth > 0 && (
        <FlatList
          ref={flatListRef}
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          decelerationRate="fast"
          snapToInterval={containerWidth}
          snapToAlignment="center"
          removeClippedSubviews={true}
        />
      )}

      {/* Pagination dots */}
      {items.length > 1 && (
        <View style={styles.pagination}>
          {items.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  pagination: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});