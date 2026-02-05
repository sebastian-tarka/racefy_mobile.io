import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize } from '../theme';
import { logger } from '../services/logger';

interface VideoPlayerProps {
  uri: string;
  visible: boolean;
  onClose: () => void;
  thumbnailUrl?: string | null;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function VideoPlayer({ uri, visible, onClose, thumbnailUrl }: VideoPlayerProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  // Debug: Log video player initialization
  const isHttps = uri?.startsWith('https://');
  const fileExtension = uri?.split('.').pop()?.split('?')[0]?.toLowerCase();

  logger.debug('general', 'VideoPlayer initializing', {
    uri,
    visible,
    thumbnailUrl,
    isHttps,
    fileExtension,
    platform: Platform.OS,
  });

  const player = useVideoPlayer(uri, (player) => {
    logger.debug('general', 'VideoPlayer player created, starting playback');
    player.loop = true;
    player.play();
  });

  useEffect(() => {
    if (!player) return;

    const statusSubscription = player.addListener('statusChange', (payload) => {
      const status = payload.status;
      logger.debug('general', 'VideoPlayer status changed', { status, payload });
      if (status === 'readyToPlay') {
        logger.debug('general', 'VideoPlayer ready to play');
        setIsLoading(false);
        setError(null);
      } else if (status === 'error') {
        let errorMessage = payload.error?.message || 'Failed to load video';

        // Add helpful message for common iOS issues
        if (Platform.OS === 'ios' && !isHttps) {
          errorMessage += ' (iOS requires HTTPS)';
        }
        if (Platform.OS === 'ios' && fileExtension === 'webm') {
          errorMessage += ' (WebM not supported on iOS, use MP4)';
        }

        logger.error('general', 'VideoPlayer error', {
          error: payload.error,
          uri,
          isHttps,
          fileExtension,
          platform: Platform.OS,
        });
        setIsLoading(false);
        setError(errorMessage);
      } else if (status === 'loading') {
        logger.debug('general', 'VideoPlayer loading');
        setIsLoading(true);
      }
    });

    const playingSubscription = player.addListener('playingChange', (payload) => {
      setIsPlaying(payload.isPlaying);
    });

    return () => {
      statusSubscription.remove();
      playingSubscription.remove();
    };
  }, [player, uri]);

  // Update position periodically
  useEffect(() => {
    if (!player || !visible) return;

    const interval = setInterval(() => {
      setPosition(player.currentTime * 1000);
      setDuration(player.duration * 1000);
    }, 250);

    return () => clearInterval(interval);
  }, [player, visible]);

  const togglePlayPause = () => {
    if (!player) return;
    try {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      // Player already released, ignore
      logger.debug('general', 'VideoPlayer: player already released in togglePlayPause');
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const formatTime = (millis: number): string => {
    if (!millis || isNaN(millis)) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    if (player) {
      try {
        player.pause();
      } catch (error) {
        // Player already released, ignore
        logger.debug('general', 'VideoPlayer: player already released in handleClose');
      }
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.videoContainer}
          activeOpacity={1}
          onPress={toggleControls}
        >
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
          />

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}

          {error && (
            <View style={styles.loadingContainer}>
              <Text style={styles.errorText}>Failed to load video</Text>
              <Text style={styles.errorDetail}>{error}</Text>
              <Text style={styles.errorDetail} numberOfLines={2}>{uri}</Text>
            </View>
          )}

          {showControls && !isLoading && !error && (
            <View style={styles.controlsOverlay}>
              <TouchableOpacity
                style={styles.playPauseButton}
                onPress={togglePlayPause}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={60}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + spacing.sm }]}
          onPress={handleClose}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Progress bar */}
        {showControls && duration > 0 && !error && (
          <View style={[styles.progressContainer, { bottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${(position / duration) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: screenWidth,
    height: screenHeight,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  errorDetail: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: fontSize.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
