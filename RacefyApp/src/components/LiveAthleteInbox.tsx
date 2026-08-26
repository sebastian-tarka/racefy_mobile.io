import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { useLiveAthleteInbox } from '../hooks/useLiveAthleteInbox';
import { upgradePromptEmitter } from '../services/upgradePromptEmitter';
import { borderRadius, fontSize, spacing } from '../theme';

interface Props {
  activityId: number | null;
  /** Only true while actually broadcasting. */
  isBroadcasting: boolean;
  /** The athlete's `live.tts_incoming` preference. */
  ttsIncoming: boolean;
}

/**
 * Incoming spectator messages, shown to the athlete on the recording screen.
 *
 * Kept to a single line: the athlete is moving and cannot read a feed. Anything
 * longer belongs in the post-activity view, where the messages persist anyway.
 */
export function LiveAthleteInbox({ activityId, isBroadcasting, ttsIncoming }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { latest, unreadCount, markAllSeen, ttsFailure, clearTtsFailure, speak } =
    useLiveAthleteInbox(activityId, { enabled: isBroadcasting, autoPlayTts: ttsIncoming });

  // A free-tier rejection is a sales moment, not an error: route it to the
  // existing upgrade prompt instead of showing a dead-end message.
  //
  // `audio_coach_ai` is the paywall's key for the same underlying AI voice
  // capability. It has to be one the paywall actually knows — an invented key
  // renders an empty offer.
  useEffect(() => {
    if (ttsFailure === 'upgrade_required') {
      upgradePromptEmitter.emit('show', { feature: 'audio_coach_ai' });
      clearTtsFailure();
    }
  }, [ttsFailure, clearTtsFailure]);

  if (!isBroadcasting || !activityId) return null;

  if (ttsFailure === 'limit_reached') {
    return (
      <TouchableOpacity
        onPress={clearTtsFailure}
        style={[styles.notice, { backgroundColor: colors.warning + '14' }]}
      >
        <Ionicons name="volume-mute-outline" size={16} color={colors.warning} />
        {/* Temporary cost cap — say so, or it reads as "you lost the feature". */}
        <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
          {t('live.tts.limitReached')}
        </Text>
      </TouchableOpacity>
    );
  }

  if (!latest) return null;

  return (
    <TouchableOpacity
      onPress={markAllSeen}
      onLongPress={() => speak(latest)}
      style={[styles.container, { backgroundColor: colors.cardBackgroundHighlight }]}
    >
      <Ionicons name="chatbubble-ellipses" size={16} color={colors.primary} />
      <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={1}>
        <Text style={styles.author}>{latest.user?.name ?? latest.user?.username}: </Text>
        {latest.content}
      </Text>
      {unreadCount > 1 && (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.badgeText, { color: colors.white }]}>{unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  message: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  author: {
    fontWeight: '700',
  },
  badge: {
    minWidth: 20,
    minHeight: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  noticeText: {
    flex: 1,
    fontSize: fontSize.sm,
  },
});
