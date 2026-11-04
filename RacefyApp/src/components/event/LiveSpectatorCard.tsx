import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontSize, msFont, spacing } from '../../theme';

interface LiveSpectatorCardProps {
  /** Registration still open (period challenges) → "join"; closed → "watch". */
  canJoin: boolean;
  isTeamEvent: boolean;
  isJoining: boolean;
  onJoin: () => void;
  isWatching: boolean;
  isWatchToggling: boolean;
  onToggleWatch: () => void;
}

/**
 * "Kibicujesz" — the viewer who is not registered while the event runs (design 3a–3d).
 * Open registration → join (team events go through the event screen's team flow),
 * always → watch for reminders and the winner.
 */
export function LiveSpectatorCard({
  canJoin,
  isTeamEvent,
  isJoining,
  onJoin,
  isWatching,
  isWatchToggling,
  onToggleWatch,
}: LiveSpectatorCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Card testID="live-spectator">
      <Text style={[styles.label, { color: colors.textMuted }]}>
        {t('eventLive.spectator.label', 'Spectating').toUpperCase()}
      </Text>
      <Text style={[styles.main, { color: colors.textPrimary }]}>
        {canJoin
          ? t('eventLive.spectator.canJoin', 'You can still join')
          : t('eventLive.spectator.closed', 'Registration closed')}
      </Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        {canJoin
          ? isTeamEvent
            ? t('eventLive.spectator.canJoinTeamNote')
            : t('eventLive.spectator.canJoinNote')
          : t('eventLive.spectator.closedNote')}
      </Text>

      <View style={styles.actions}>
        {canJoin && (
          <TouchableOpacity
            style={[styles.primary, { backgroundColor: colors.primary }]}
            onPress={onJoin}
            disabled={isJoining}
            activeOpacity={0.85}
            accessibilityRole="button"
            testID="live-spectator-join"
          >
            {isJoining ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.primaryText, { color: colors.onPrimary }]}>
                {t('eventLive.spectator.join', 'Join the challenge')}
              </Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.secondary,
            {
              backgroundColor: isWatching ? colors.textPrimary : colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
          onPress={onToggleWatch}
          disabled={isWatchToggling}
          activeOpacity={0.85}
          accessibilityRole="button"
          testID="live-spectator-watch"
        >
          {isWatchToggling ? (
            <ActivityIndicator
              size="small"
              color={isWatching ? colors.cardBackground : colors.textPrimary}
            />
          ) : (
            <>
              <Ionicons
                name={isWatching ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={isWatching ? colors.cardBackground : colors.textPrimary}
              />
              <Text
                style={[
                  styles.secondaryText,
                  { color: isWatching ? colors.cardBackground : colors.textPrimary },
                ]}
              >
                {isWatching
                  ? t('eventLive.spectator.watching', 'Watching')
                  : t('eventLive.spectator.watch', 'Watch event')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  main: {
    marginTop: 3,
    fontSize: fontSize.xl,
    fontWeight: '800',
    lineHeight: msFont(26),
  },
  sub: {
    marginTop: 3,
    fontSize: fontSize.sm,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  primary: {
    height: 50,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  secondary: {
    height: 46,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  secondaryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
