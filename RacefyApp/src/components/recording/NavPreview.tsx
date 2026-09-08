import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { turnIcon } from '../../utils/navigationCues';
import { borderRadius, fontSize, msFont, spacing } from '../../theme';
import type { RouteTurnInstruction } from '../../types/api';

/** The route layer's blue — same one the map draws planned routes in. */
const ROUTE_BLUE = '#2563EB';

/** How many turns fit on the strip before "all N" earns its place. */
const PREVIEW_TURNS = 3;

interface Props {
  turns: RouteTurnInstruction[];
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onOpenAll: () => void;
}

/**
 * "This route has directions" — the pre-start counterpart of the live banner
 * (design "Racefy v2" → NavPreview).
 *
 * The point is to answer one question before committing: will the phone tell me
 * where to go, out loud or only on screen? The first few turns are there so the
 * athlete can recognise the route as the one they meant to pick.
 */
export function NavPreview({ turns, voiceEnabled, onToggleVoice, onOpenAll }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatDistance } = useUnits();

  if (turns.length === 0) return null;

  const head = turns.slice(0, PREVIEW_TURNS);

  return (
    <View
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: ROUTE_BLUE + '1A' }]}>
          <Ionicons name="navigate" size={16} color={ROUTE_BLUE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {t('navigation.readyTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {t('navigation.cueCount', { count: turns.length })} ·{' '}
            {t(voiceEnabled ? 'navigation.previewVoice' : 'navigation.previewSilent')}
          </Text>
        </View>
        <Switch
          value={voiceEnabled}
          onValueChange={onToggleVoice}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={voiceEnabled ? colors.primary : colors.white}
          accessibilityLabel={t(voiceEnabled ? 'navigation.voiceOn' : 'navigation.voiceOff')}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {head.map((turn, index) => (
          <View
            key={`${turn.distance_along}-${index}`}
            style={[styles.chip, { backgroundColor: colors.background }]}
          >
            <Ionicons name={turnIcon(turn.maneuver)} size={14} color={ROUTE_BLUE} />
            <Text style={[styles.chipAt, { color: colors.textMuted }]}>
              {formatDistance(turn.distance_along)}
            </Text>
            <Text style={[styles.chipText, { color: colors.textPrimary }]} numberOfLines={1}>
              {turn.instruction}
            </Text>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.allButton, { borderColor: colors.border }]}
          onPress={onOpenAll}
          activeOpacity={0.8}
        >
          <Text style={[styles.allText, { color: colors.primary }]}>
            {t('navigation.allCount', { count: turns.length })}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  strip: {
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    maxWidth: 190,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.full,
  },
  chipAt: {
    fontSize: msFont(10),
    fontVariant: ['tabular-nums'],
  },
  chipText: {
    flexShrink: 1,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  allButton: {
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  allText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
