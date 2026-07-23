import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { useLiveBroadcasts } from '../hooks/useLiveBroadcasts';
import { borderRadius, fontSize, spacing } from '../theme';

interface Props {
  userId: number | null | undefined;
  onPress: (activityId: number) => void;
}

/** Refreshed often enough that the card disappears shortly after they stop. */
const REFRESH_INTERVAL_MS = 20_000;

/**
 * "Broadcasting now" banner on an athlete's profile.
 *
 * Uses the `user_id` filter rather than scanning the global list: that list is
 * paginated at 20, so an athlete past the first page would look offline. The
 * filter only narrows — visibility and blocking still apply server-side, so
 * this cannot reveal a broadcast the viewer was not allowed to see.
 */
export function LiveNowCard({ userId, onPress }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { broadcasts } = useLiveBroadcasts({
    user_id: userId ?? undefined,
    enabled: !!userId,
    refreshIntervalMs: REFRESH_INTERVAL_MS,
  });

  const broadcast = broadcasts[0];
  if (!broadcast) return null;

  return (
    <TouchableOpacity
      onPress={() => onPress(broadcast.id)}
      activeOpacity={0.85}
      style={[
        styles.card,
        { backgroundColor: colors.error + '14', borderColor: colors.error + '40' },
      ]}
    >
      <View style={[styles.iconTile, { backgroundColor: colors.error + '1f' }]}>
        <Ionicons name="radio" size={18} color={colors.error} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('live.nowCard.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {t('live.nowCard.subtitle')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.error} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.sm,
  },
});
