import React, {useRef, useState} from 'react';
import {LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import YoutubePlayer, {YoutubeIframeRef} from 'react-native-youtube-iframe';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../hooks/useTheme';
import {fontSize, spacing} from '../theme';

interface YouTubeEmbedProps {
  embedId: string;
}

export function YouTubeEmbed({ embedId }: YouTubeEmbedProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const playerRef = useRef<YoutubeIframeRef>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const height = containerWidth > 0 ? Math.round(containerWidth * (9 / 16)) : 0;

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const onChangeState = (state: string) => {
    if (state === 'ended') {
      setPlaying(false);
      setEnded(true);
    } else if (state === 'playing') {
      setEnded(false);
    }
  };

  const watchAgain = () => {
    playerRef.current?.seekTo(0, true);
    setEnded(false);
    setPlaying(true);
  };

  return (
    <View style={{ width: '100%' }} onLayout={onLayout}>
      {containerWidth > 0 && (
        <>
          <YoutubePlayer
            ref={playerRef}
            height={height}
            width={containerWidth}
            videoId={embedId}
            play={playing}
            onChangeState={onChangeState}
            initialPlayerParams={{ rel: 0, preventFullScreen: false }}
          />
          {ended && (
            <View style={styles.overlay}>
              <TouchableOpacity style={[styles.watchAgainButton, { backgroundColor: colors.primary }]} onPress={watchAgain} activeOpacity={0.8}>
                <Text style={styles.watchAgainText}>{t('feed.watchAgain')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchAgainButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 24,
  },
  watchAgainText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});