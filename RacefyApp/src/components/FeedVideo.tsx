import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Image, ImageLoadEventData} from 'expo-image';
import {Ionicons} from '@expo/vector-icons';
import {useViewability} from '../hooks/useViewability';

interface FeedVideoProps {
  videoUrl: string;
  thumbnailUrl?: string | null;
  aspectRatio?: number;
  previewHeight?: number;
  /** When true, stretches to fill parent container instead of using aspectRatio for sizing */
  fillContainer?: boolean;
  onScroll?: () => void;
  onExpand?: () => void;
}

let AutoPlayVideoComponent: React.ComponentType<FeedVideoProps> | null = null;
function getAutoPlayVideo() {
  if (!AutoPlayVideoComponent) {
    AutoPlayVideoComponent = require('./AutoPlayVideo').AutoPlayVideo;
  }
  return AutoPlayVideoComponent!;
}

export function FeedVideo(props: FeedVideoProps) {
  const { aspectRatio: propAspectRatio = 16 / 9, thumbnailUrl, fillContainer } = props;
  const { viewRef, isViewable } = useViewability({ threshold: 85, delay: 100 });

  // Detect real aspect ratio from thumbnail (fixes rotation mismatch from backend)
  const [detectedAspectRatio, setDetectedAspectRatio] = useState<number | null>(null);

  const onThumbnailLoad = useCallback((event: ImageLoadEventData) => {
    const { width, height } = event.source;
    if (width > 0 && height > 0) {
      const detected = width / height;
      if (Math.abs(detected - propAspectRatio) > 0.1) {
        setDetectedAspectRatio(detected);
      }
    }
  }, [propAspectRatio]);

  // Use detected ratio (from thumbnail) if available, otherwise backend ratio
  const aspectRatio = detectedAspectRatio ?? propAspectRatio;

  // fillContainer mode: stretch to fill parent (no aspectRatio sizing)
  const containerStyle = fillContainer
    ? styles.fillContainer
    : [styles.placeholder, { aspectRatio }];

  if (!isViewable) {
    return (
      <View ref={viewRef} style={containerStyle}>
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            onLoad={onThumbnailLoad}
          />
        ) : null}
        <View style={styles.playOverlay}>
          <View style={styles.playIcon}>
            <Ionicons name="play" size={24} color="#FFFFFF" />
          </View>
        </View>
      </View>
    );
  }

  // Pass corrected aspectRatio and fillContainer to AutoPlayVideo
  const AutoPlayVideo = getAutoPlayVideo();
  return <AutoPlayVideo {...props} aspectRatio={aspectRatio} fillContainer={fillContainer} />;
}

const styles = StyleSheet.create({
  placeholder: {
    width: '100%',
    backgroundColor: '#000',
  },
  fillContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  playOverlay: {
    position: 'absolute', width: '100%', height: '100%',
    justifyContent: 'center', alignItems: 'center',
  },
  playIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
    paddingLeft: 3,
  },
});