import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { useVoiceClipPlayer } from '../hooks/useVoiceClipPlayer';
import { formatClipSeconds } from '../services/liveCheer/message';
import { borderRadius, fontSize, spacing } from '../theme';

interface Props {
  /** Signed url or local file; null once the file was purged. */
  uri: string | null | undefined;
  durationMs: number | null | undefined;
  /** Shown under the player when present — STT output, possibly empty. */
  transcript?: string;
  /** Lighter text for a line inside a dense list (spectator panel). */
  compact?: boolean;
}

/**
 * A voice cheer wherever messages are listed: play/stop, length, transcript.
 * With the file gone it says so instead of offering a button that does nothing.
 */
export function LiveVoiceClip({ uri, durationMs, transcript, compact }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isPlaying, isLoading, toggle } = useVoiceClipPlayer(uri);
  const textSize = compact ? fontSize.sm : fontSize.md;

  return (
    <View style={styles.wrap}>
      {uri ? (
        <TouchableOpacity
          onPress={toggle}
          disabled={isLoading}
          style={[styles.player, { backgroundColor: colors.primary + '1f' }]}
          accessibilityRole="button"
          accessibilityLabel={t(isPlaying ? 'live.voice.stop' : 'live.voice.play')}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name={isPlaying ? 'stop' : 'play'} size={16} color={colors.primary} />
          )}
          <Ionicons name="mic" size={12} color={colors.primary} />
          <Text style={[styles.duration, { color: colors.primary }]}>
            {formatClipSeconds(durationMs)}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.player, { backgroundColor: colors.border }]}>
          <Ionicons name="mic-off-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.duration, { color: colors.textMuted }]}>
            {t('live.voice.expired')}
            {durationMs ? ` · ${formatClipSeconds(durationMs)}` : ''}
          </Text>
        </View>
      )}
      {!!transcript && (
        <Text style={[styles.transcript, { color: colors.textSecondary, fontSize: textSize }]}>
          {transcript}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 1,
    gap: spacing.xs,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  duration: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  transcript: {
    fontStyle: 'italic',
  },
});
