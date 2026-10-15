import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, spacing } from '../../theme';
import type { StrengthSessionSummary } from '../../types/api';
import { StrengthSetMosaic } from './StrengthSetMosaic';
import { StrengthVolumePanel } from './StrengthVolumePanel';
import { formatVolume, hasStrengthSession } from './strengthSession';

/**
 * What a strength workout shows on a feed card where a run shows its map: the
 * set mosaic, and under it the volume with records. Tapping it opens the
 * activity, like tapping the map does.
 */
export function StrengthFeedPanel({
  session,
  onPress,
}: {
  session: StrengthSessionSummary | null | undefined;
  onPress?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  if (!hasStrengthSession(session)) return null;

  const summary = t('activities.strength.a11ySummary', {
    volume: formatVolume(session.stats.volume_kg, i18n.language),
    sets: session.stats.sets_completed,
    setsTotal: session.stats.sets_total,
    exercises: session.stats.exercises_completed,
    exercisesTotal: session.stats.exercises,
  });

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.85}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={summary}
      accessibilityHint={onPress ? t('feed.viewDetails') : undefined}
    >
      <View style={styles.section}>
        <StrengthSetMosaic session={session} />
      </View>
      <View style={[styles.section, styles.divided, { borderTopColor: colors.border }]}>
        <StrengthVolumePanel session={session} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  section: {
    padding: spacing.lg,
  },
  divided: {
    borderTopWidth: 1,
  },
});
