import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
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

let playerIdCounter = 0;

export function AutoPlayVideo({
  videoUrl,
  thumbnailUrl,
  aspectRatio = 16 / 9,
  onExpand,
}: AutoPlayVideoProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerIdRef = useRef<string>(`video-player-${++playerIdCounter}-${Date.now()}`);

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = true;
    p.volume = 0;
  });

  useEffect(() => {
    const sub = player.addListener('playingChange', (event) => {
      setIsPlaying(event.isPlaying);
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    VideoPlayerManager.register(playerIdRef.current, player);
    try {
      player.currentTime = 0;
      VideoPlayerManager.playExclusive(playerIdRef.current);
    } catch {}
    return () => VideoPlayerManager.unregister(playerIdRef.current);
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
    } catch {}
  }, [player]);

  return (
    <View style={[styles.container, { aspectRatio }]}>
      {thumbnailUrl && (
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.fill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      )}

      <VideoView
        player={player}
        style={styles.fill}
        nativeControls={false}
        contentFit="cover"
        allowsPictureInPicture={false}
      />

      <TouchableOpacity style={styles.controls} activeOpacity={0.9} onPress={togglePlayPause}>
        {onExpand && (
          <TouchableOpacity
            style={styles.expandBtn}
            onPress={(e) => { e.stopPropagation(); onExpand(); }}
          >
            <Ionicons name="expand" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.muteBtn}
          onPress={(e) => { e.stopPropagation(); toggleMute(); }}
        >
          <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
        </TouchableOpacity>

        {showPlayIcon && (
          <View style={styles.playFeedback}>
            <View style={styles.playIcon}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#fff" />
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
  },
  fill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  controls: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  expandBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  muteBtn: {
    position: 'absolute', bottom: 12, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  playFeedback: {
    position: 'absolute', width: '100%', height: '100%',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
    paddingLeft: 3,
  },
});