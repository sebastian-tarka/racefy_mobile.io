import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { Avatar } from './Avatar';
import { Card } from './Card';
import { useTheme } from '../hooks/useTheme';
import { useLiveMessageArchive } from '../hooks/useLiveMessageArchive';
import { useUnits } from '../hooks/useUnits';
import { borderRadius, fontSize, spacing } from '../theme';
import type { Activity, LiveMessage, User } from '../types/api';
import { formatDuration } from '../utils/formatDuration';

const hairline = StyleSheet.hairlineWidth;

interface Props {
  activity: Activity | null;
  onUserPress?: (user: User) => void; /**
   * Pass the screen's own archive when it also draws the pins, so the list and
   * the map share one fetch. Without it the card fetches for itself.
   */
  archive?: ReturnType<typeof useLiveMessageArchive>;
  /** Tap on a message that has a position — the screen focuses its pin. */
  onSelectMessage?: (message: LiveMessage) => void;
  selectedMessageId?: number | null;
}

/**
 * The cheers and private notes a spectator sent during the broadcast, shown on
 * the finished activity.
 *
 * The athlete sees these while running, one line at a time on the recording
 * screen, and until now that was the only chance to read them — the messages
 * outlived the broadcast in the database but had no surface afterwards.
 *
 * Renders nothing at all when there is nothing to say: not the owner, never
 * broadcast, still loading, or broadcast with no messages. An empty "no cheers"
 * card on every activity would be worse than the gap it fills.
 */
export function ActivityLiveMessages({
  activity,
  onUserPress,
  archive,
  onSelectMessage,
  selectedMessageId = null,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistance } = useUnits();
  // A null activity keeps the hook idle, so a screen-provided archive is the
  // only fetch in flight.
  const own = useLiveMessageArchive(archive ? null : activity);
  const { messages, privateCount, isLoading, error, retry, isAvailable } = archive ?? own;

  if (!isAvailable) return null;

  if (error) {
    return (
      <Card style={styles.section}>
        <TouchableOpacity onPress={retry} style={styles.errorRow} accessibilityRole="button">
          <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {t('live.archive.loadFailed')}
          </Text>
        </TouchableOpacity>
      </Card>
    );
  }

  // Nothing to show yet, and possibly nothing ever: staying invisible until the
  // messages are in avoids a card that pops in and then disappears.
  if (isLoading || messages.length === 0) return null;

  return (
    <Card style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="megaphone-outline" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('live.archive.title')}</Text>
      </View>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {privateCount > 0
          ? t('live.archive.countWithPrivate', { count: messages.length, private: privateCount })
          : t('live.archive.count', { count: messages.length })}
      </Text>

      {messages.map((message) => {
        const author = message.user;
        const isPrivate = message.live_visibility === 'private';
        // Distance survives a privacy zone (only the pin is withheld); both are
        // null for messages from before the API recorded them.
        const hasDistance = typeof message.live_distance === 'number';
        const hasPin = Array.isArray(message.live_position);
        const isSelected = selectedMessageId === message.id;
        const isLast = message.id === messages[messages.length - 1]?.id;

        return (
          <TouchableOpacity
            key={message.id}
            style={[
              styles.messageRow,
              !isLast && { borderBottomColor: colors.borderLight, borderBottomWidth: hairline },
              // A solid brand-coloured block made the secondary text (time,
              // distance, "private") unreadable on top of it. A tint plus an
              // accent edge says "this one" and leaves every colour legible.
              isSelected && {
                backgroundColor: colors.primary + '1f',
                borderLeftColor: colors.primary,
                borderBottomWidth: 0,
              },
              isSelected && styles.messageRowSelected,
            ]}
            disabled={!hasPin || !onSelectMessage}
            onPress={() => onSelectMessage?.(message)}
            activeOpacity={0.7}
            accessibilityRole={hasPin && onSelectMessage ? 'button' : undefined}
            accessibilityHint={hasPin && onSelectMessage ? t('live.archive.showOnMap') : undefined}
          >
            <TouchableOpacity
              disabled={!author || !onUserPress}
              onPress={() => author && onUserPress?.(author)}
              accessibilityRole={author && onUserPress ? 'button' : undefined}
            >
              {/* `avatar`, like CommentItem: `avatar_url` is the field the feed
                  endpoints use, and comments carry the plain one. */}
              <Avatar uri={author?.avatar} name={author?.name || '?'} size="sm" />
            </TouchableOpacity>

            <View style={styles.messageBody}>
              <View style={styles.messageMeta}>
                <Text style={[styles.author, { color: colors.textPrimary }]} numberOfLines={1}>
                  {author?.name ?? author?.username ?? ''}
                </Text>
                <Text style={[styles.time, { color: colors.textMuted }]}>
                  {format(new Date(message.created_at), 'p')}
                </Text>
              </View>

              <Text style={[styles.content, { color: colors.textPrimary }]}>{message.content}</Text>

              {hasDistance && (
                <View style={styles.whereRow}>
                  <Ionicons
                    name={hasPin ? 'location' : 'location-outline'}
                    size={11}
                    color={hasPin ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.whereLabel, { color: colors.textMuted }]}>
                    {t('live.archive.atDistance', {
                      distance: formatDistance(message.live_distance as number),
                    })}
                    {typeof message.live_duration === 'number' &&
                      ` · ${formatDuration(message.live_duration)}`}
                  </Text>
                </View>
              )}

              {isPrivate && (
                <View style={styles.privateRow}>
                  <Ionicons name="lock-closed" size={11} color={colors.textMuted} />
                  <Text style={[styles.privateLabel, { color: colors.textMuted }]}>
                    {t('live.archive.privateNote')}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    // Matches `styles.section` on the activity detail screen — without the top
    // margin this card sat tighter to the one above than every other card.
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    // Pulled back out by the negative margin so the text still lines up with
    // the card title while a highlighted row gets room to breathe.
    paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  messageRowSelected: {
    borderRadius: borderRadius.md,
  },
  messageBody: {
    flex: 1,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  author: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  time: {
    fontSize: fontSize.xs,
  },
  content: {
    fontSize: fontSize.md,
    marginTop: 2,
  },
  whereRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  whereLabel: {
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  privateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  privateLabel: {
    fontSize: fontSize.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontSize: fontSize.sm,
  },
});
