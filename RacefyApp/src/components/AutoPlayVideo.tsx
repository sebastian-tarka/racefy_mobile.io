import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useViewability } from '../hooks/useViewability';

interface AutoPlayVideoProps {
  videoUrl: string;
  thumbnailUrl?: string | null;
  aspectRatio?: number;
  onScroll?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function AutoPlayVideo({
  videoUrl,
  thumbnailUrl,
  aspectRatio = 16 / 9,
  onScroll,
}: AutoPlayVideoProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const { viewRef, isViewable, checkViewability } = useViewability({ threshold: 50, delay: 100 });

  // Calculate height based on full screen width and aspect ratio
  const videoHeight = screenWidth / aspectRatio;

  // Create video player instance
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = true;
    player.muted = true;
    player.volume = 0;
  });

  // Handle viewability changes - auto play/pause
  useEffect(() => {
    if (isViewable) {
      // Start playing when 50% visible
      player.play();
    } else {
      // Pause when not visible
      player.pause();
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
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
    setShowControls(true);
    // Hide controls after 800ms (feedback duration from UX analysis)
    setTimeout(() => setShowControls(false), 800);
  }, [player]);

  return (
    <View
      ref={viewRef}
      style={[styles.container, { height: videoHeight }]}
      onLayout={checkViewability}
    >
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit="cover"
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />

      {/* Overlay controls */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={0.9}
        onPress={togglePlayPause}
      >
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
    </View>
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
