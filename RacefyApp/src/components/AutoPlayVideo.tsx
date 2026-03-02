import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { VideoPlayerManager } from '../services/VideoPlayerManager';

interface AutoPlayVideoProps {
  videoUrl: string;
  thumbnailUrl?: string | null;
  aspectRatio?: number;
  previewHeight?: number;
  onScroll?: () => void;
  onExpand?: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const MAX_VIDEO_HEIGHT = screenHeight * 0.7;

let playerIdCounter = 0;

/**
 * AutoPlayVideo - Renders and plays a video.
 *
 * Visibility is managed by FeedVideo wrapper which mounts/unmounts this component.
 * When mounted → always shows VideoView and auto-plays exclusively.
 * When unmounted → player is released, memory freed.
 */
export function AutoPlayVideo({
  videoUrl,
  thumbnailUrl,
  aspectRatio = 16 / 9,
  previewHeight,
  onExpand,
}: AutoPlayVideoProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const playerIdRef = useRef<string>(`video-player-${++playerIdCounter}-${Date.now()}`);

  const isPortrait = aspectRatio < 1;
  const rawVideoHeight = screenWidth / aspectRatio;
  // Container matches video's natural height (capped for portrait).
  // No previewHeight clamp - avoids letterboxing for landscape videos.
  const displayHeight = Math.min(rawVideoHeight, MAX_VIDEO_HEIGHT);

  // Create video player
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = true;
    p.volume = 0;
  });

  // Track playing state
  useEffect(() => {
    const sub = player.addListener('playingChange', (event) => {
      setIsPlaying(event.isPlaying);
    });
    return () => sub.remove();
  }, [player]);

  // On mount: register and auto-play exclusively. On unmount: cleanup.
  useEffect(() => {
    VideoPlayerManager.register(playerIdRef.current, player);

    // Auto-play exclusively - pause all others, play this one
    try {
      player.currentTime = 0;
      VideoPlayerManager.playExclusive(playerIdRef.current);
    } catch {
      // Player not ready yet
    }

    return () => {
      VideoPlayerManager.unregister(playerIdRef.current);
    };
  }, [player]);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    player.muted = next;
    player.volume = next ? 0 : 1;
  }, [isMuted, player]);

  const togglePlayPause = useCallback(() => {
    try {
      if (player.playing) {
        player.pause();
      } else {
        VideoPlayerManager.playExclusive(playerIdRef.current);
      }
      setShowPlayIcon(true);
      setTimeout(() => setShowPlayIcon(false), 800);
    } catch {
      // Player released
    }
  }, [player]);

  return (
    <View style={[styles.container, { height: displayHeight }]}>
      {/* Thumbnail behind video - visible while video loads */}
      {thumbnailUrl && (
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.thumbnail}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      )}

      {/* Video layer - contain ensures video never overflows container bounds */}
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit="contain"
        allowsPictureInPicture={false}
      />

      {/* Controls overlay */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={0.9}
        onPress={togglePlayPause}
      >
        {onExpand && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={(e) => { e.stopPropagation(); onExpand(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="expand" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.muteButton}
          onPress={(e) => { e.stopPropagation(); toggleMute(); }}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>

        {showPlayIcon && (
          <View style={styles.playPauseOverlay}>
            <View style={styles.playIconCircle}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
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
    backgroundColor: '#000',
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  expandButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseOverlay: {
    ...StyleSheet.absoluteFillObject,
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