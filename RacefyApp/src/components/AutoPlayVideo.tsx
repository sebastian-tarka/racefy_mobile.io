import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useViewability } from '../hooks/useViewability';
import { VideoPlayerManager } from '../services/VideoPlayerManager';

interface AutoPlayVideoProps {
  videoUrl: string;
  thumbnailUrl?: string | null;
  aspectRatio?: number;
  previewHeight?: number;
  onScroll?: () => void;
  onExpand?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

// Counter for generating unique player IDs
let playerIdCounter = 0;

export function AutoPlayVideo({
  videoUrl,
  thumbnailUrl,
  aspectRatio = 16 / 9,
  previewHeight,
  onScroll,
  onExpand,
}: AutoPlayVideoProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { viewRef, isViewable, checkViewability } = useViewability({ threshold: 50, delay: 100 });

  // Generate unique ID for this player instance
  const playerIdRef = useRef<string>(`video-player-${++playerIdCounter}-${Date.now()}`);

  // Calculate height based on full screen width and aspect ratio
  const videoHeight = screenWidth / aspectRatio;

  // Expand/collapse support when previewHeight is set and video is taller
  const showToggle = previewHeight != null && videoHeight > previewHeight;
  const isCropped = showToggle && !expanded;
  const displayHeight = showToggle ? (expanded ? videoHeight : previewHeight) : videoHeight;

  // Animated height with spring physics
  const animatedHeight = useSharedValue(displayHeight);

  useEffect(() => {
    animatedHeight.value = withSpring(displayHeight, { damping: 20, stiffness: 300 });
  }, [displayHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  // Create video player instance
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = true;
    player.muted = true;
    player.volume = 0;
  });

  // Register player with VideoPlayerManager on mount
  useEffect(() => {
    VideoPlayerManager.register(playerIdRef.current, player);

    return () => {
      VideoPlayerManager.unregister(playerIdRef.current);
    };
  }, [player]);

  // Reset player when URL changes
  useEffect(() => {
    try {
      player.pause();
      player.currentTime = 0;
    } catch (error) {
      // Player already released, ignore
    }

    return () => {
      try {
        player.pause();
      } catch (error) {
        // Player already released, ignore
      }
    };
  }, [videoUrl, player]);

  // Handle viewability changes - auto play/pause
  useEffect(() => {
    try {
      if (isViewable) {
        // Start playing when 50% visible
        player.play();
      } else {
        // Pause when not visible
        player.pause();
      }
    } catch (error) {
      // Player already released, ignore
    }
  }, [isViewable, player]);

  // Check viewability on mount and when scroll happens
  useEffect(() => {
    checkViewability();
  }, [checkViewability, onScroll]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    player.muted = newMutedState;
    player.volume = newMutedState ? 0 : 1;
  }, [isMuted, player]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    try {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
      setShowControls(true);
      // Hide controls after 800ms (feedback duration from UX analysis)
      setTimeout(() => setShowControls(false), 800);
    } catch (error) {
      // Player already released, ignore
    }
  }, [player]);

  return (
    <Animated.View
      ref={viewRef}
      style={[styles.container, showToggle ? animatedStyle : { height: videoHeight }]}
      onLayout={checkViewability}
    >
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit="cover"
        allowsPictureInPicture={false}
        fullscreenOptions={{ enable: false }}
      />

      {/* Gradient fade when cropped - signals "there's more" */}
      {isCropped && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)']}
          style={styles.gradientOverlay}
          pointerEvents="none"
        />
      )}

      {/* Overlay controls */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={0.9}
        onPress={togglePlayPause}
      >
        {/* Expand button - top right */}
        {onExpand && (
          <TouchableOpacity
            style={[styles.expandButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
            onPress={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="expand" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Mute/Unmute button */}
        <TouchableOpacity
          style={[styles.muteButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
          onPress={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Toggle expand/collapse button - bottom center */}
        {showToggle && (
          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
            onPress={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        )}

        {/* Play/Pause icon (shown briefly) */}
        {showControls && (
          <View style={styles.playPauseOverlay}>
            <View style={styles.playIconCircle}>
              <Ionicons
                name={player.playing ? 'pause' : 'play'}
                size={24}
                color="#FFFFFF"
              />
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  muteButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  toggleButton: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  playPauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 3,
  },
});
