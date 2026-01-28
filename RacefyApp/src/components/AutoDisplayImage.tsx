import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface AutoDisplayImageProps {
  imageUrl: string;
  onExpand?: () => void;
  previewHeight?: number; // Max height for preview mode
}

const { width: screenWidth } = Dimensions.get('window');

export function AutoDisplayImage({
  imageUrl,
  onExpand,
  previewHeight = 300,
}: AutoDisplayImageProps) {
  const [expanded, setExpanded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Get image dimensions and calculate aspect ratio
  useEffect(() => {
    Image.getSize(
      imageUrl,
      (width, height) => {
        setAspectRatio(width / height);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to get image size:', error);
        setAspectRatio(16 / 9); // Fallback aspect ratio
        setLoading(false);
      }
    );
  }, [imageUrl]);

  // Calculate full height based on screen width and aspect ratio
  const fullHeight = aspectRatio ? screenWidth / aspectRatio : previewHeight;

  // Animated height with spring physics
  const animatedHeight = useSharedValue(Math.min(fullHeight, previewHeight));

  // Update animated height when expanded state changes
  useEffect(() => {
    if (!loading && aspectRatio) {
      animatedHeight.value = withSpring(
        expanded ? fullHeight : Math.min(fullHeight, previewHeight),
        {
          damping: 20,
          stiffness: 300,
        }
      );
    }
  }, [expanded, loading, aspectRatio, fullHeight, previewHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  if (loading || !aspectRatio) {
    return (
      <View style={[styles.container, { height: previewHeight }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  // Show expand/collapse button if image is taller than preview height
  const showToggle = fullHeight > previewHeight;

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Determine if we're in cropped preview mode
  const isCropped = !expanded && fullHeight > previewHeight;

  // Determine if portrait (aspect ratio > 1.3)
  const isPortrait = aspectRatio > 1.3;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {isCropped ? (
        // Cropped mode: center-weighted crop
        // For portraits, show from 25% down (catches faces in upper-middle)
        // For landscapes, center crop
        <View style={styles.cropContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={[
              styles.croppedImage,
              {
                width: screenWidth,
                height: fullHeight,
                top: isPortrait ? '-25%' : '50%',
                transform: [
                  { translateY: isPortrait ? 0 : -fullHeight / 2 },
                ],
              },
            ]}
          />
        </View>
      ) : (
        // Full display mode: show entire image
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, { width: screenWidth, height: fullHeight }]}
        />
      )}

      {/* Gradient fade when content is cropped - signals "there's more" */}
      {isCropped && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)']}
          style={styles.gradientOverlay}
          pointerEvents="none"
        />
      )}

      {/* Overlay controls */}
      <View style={styles.overlay}>
        {/* Expand/Modal button - top right */}
        {onExpand && (
          <TouchableOpacity
            style={[styles.expandButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
            onPress={onExpand}
            activeOpacity={0.8}
          >
            <Ionicons name="expand" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Toggle expand/collapse button - bottom center */}
        {showToggle && (
          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
            onPress={toggleExpanded}
            activeOpacity={0.8}
          >
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cropContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  croppedImage: {
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none', // Allow touch events to pass through to children
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
  toggleButton: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});
