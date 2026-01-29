import React, { useState, useRef } from 'react';
import { View, FlatList, Dimensions, StyleSheet, ViewToken } from 'react-native';
import { AutoPlayVideo } from './AutoPlayVideo';
import { AutoDisplayImage } from './AutoDisplayImage';
import type { PostMediaItem } from './FeedCard.utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MediaSliderProps {
  items: PostMediaItem[];
  onImagePress?: (index: number) => void;
  aspectRatio?: number;
  previewHeight?: number;
}

export function MediaSlider({
  items,
  onImagePress,
  aspectRatio = 16 / 9,
  previewHeight = 300
}: MediaSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

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
        <View style={styles.slide}>
          <AutoPlayVideo
            videoUrl={item.url}
            thumbnailUrl={item.thumbnailUrl}
            aspectRatio={aspectRatio}
          />
        </View>
      );
    }

    return (
      <View style={styles.slide}>
        <AutoDisplayImage
          imageUrl={item.url}
          onExpand={() => onImagePress?.(index)}
          previewHeight={previewHeight}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
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
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="center"
      />

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
  slide: {
    width: SCREEN_WIDTH,
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