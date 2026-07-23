import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../theme';
import { Avatar } from './Avatar';
import type { LiveBroadcast } from '../types/api';

interface Props {
  broadcast: LiveBroadcast;
  onPress: () => void;
}

const fmtKm = (meters: number) => `${(Math.round(meters / 100) / 10).toFixed(1)} km`;

const fmtDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m} min`;
};

/** A single broadcast in the live list. */
export function LiveBroadcastCard({ broadcast, onPress }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const { user, stats, position } = broadcast;
  // `null` position means the athlete is inside a privacy zone right now.
  const isHidden = position === null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
    >
      <Avatar uri={user?.avatar} name={user?.name} size="md" />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {user?.name ?? user?.username}
          </Text>
          <View style={[styles.livePill, { backgroundColor: colors.error + '1f' }]}>
            <View style={[styles.dot, { backgroundColor: colors.error }]} />
            <Text style={[styles.liveText, { color: colors.error }]}>{t('live.list.badge')}</Text>
          </View>
        </View>

        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
          {[
            broadcast.sport_type?.name,
            stats ? fmtKm(stats.distance) : null,
            stats ? fmtDuration(stats.duration) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        {isHidden && (
          <View style={styles.hiddenRow}>
            <Ionicons name="eye-off-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.hiddenText, { color: colors.textMuted }]}>
              {t('live.positionHidden')}
            </Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  meta: {
    fontSize: fontSize.sm,
  },
  hiddenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  hiddenText: {
    fontSize: fontSize.xs,
  },
});
