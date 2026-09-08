import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useUnits } from '../../hooks/useUnits';
import { turnIcon, turnLabelKey, type NavBannerState } from '../../utils/navigationCues';
import { borderRadius, fontSize, heroColors, msFont, spacing } from '../../theme';

/** The route layer's blue — same one the map draws planned routes in. */
const ROUTE_BLUE = '#2563EB';
const IMMINENT_BG = 'rgba(37,99,235,0.92)';
const IMMINENT_BORDER = 'rgba(147,197,253,0.7)';

interface Props {
  state: NavBannerState;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  onOpenCueList?: () => void;
}

/**
 * The turn-by-turn banner on the live screen (design "Racefy v2" → NavBanner).
 *
 * One instruction at a time, because an athlete moving at speed reads exactly
 * one thing. The distance to it is the biggest figure on the card, the approach
 * bar shows how much of this leg is behind, and the turn after it gets a single
 * quiet line so the next decision is never a surprise.
 *
 * Inside ~120 m the card flips to solid blue: at that point it is no longer
 * information, it is an instruction, and it should be readable at a glance
 * without hunting for it among the other numbers.
 */
export function NavBanner({ state, voiceEnabled, onToggleVoice, onOpenCueList }: Props) {
  const { t } = useTranslation();
  const { formatDistance } = useUnits();
  const { current, after, distanceToTurn, legProgress, remaining, done, imminent, offRoute } =
    state;

  const icon = current ? turnIcon(current.maneuver) : 'flag';
  const label = current ? t(turnLabelKey(current.maneuver)) : t('navigation.routeComplete');

  const ink = imminent ? '#ffffff' : heroColors.ink;
  const inkSoft = imminent ? 'rgba(255,255,255,0.8)' : heroColors.inkSoft;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: imminent ? IMMINENT_BG : heroColors.surface,
          borderColor: imminent ? IMMINENT_BORDER : heroColors.line,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={
        done
          ? t('navigation.routeComplete')
          : `${label}. ${distanceToTurn != null ? formatDistance(distanceToTurn) : ''}. ${current?.instruction ?? ''}`
      }
    >
      {offRoute && (
        <View style={styles.offRouteRow}>
          <Ionicons name="warning" size={14} color="#ffffff" />
          <Text style={styles.offRouteText} numberOfLines={1}>
            {t('navigation.offRoute')} · {formatDistance(state.distanceFromRoute)}
          </Text>
        </View>
      )}

      <View style={styles.mainRow}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: imminent ? '#ffffff' : heroColors.surfaceStrong },
          ]}
        >
          <Ionicons name={icon} size={28} color={imminent ? ROUTE_BLUE : heroColors.ink} />
        </View>

        <View style={styles.body}>
          <View style={styles.headline}>
            <Text style={[styles.distance, { color: ink }]} numberOfLines={1}>
              {done || distanceToTurn == null ? '—' : formatDistance(distanceToTurn)}
            </Text>
            <Text style={[styles.maneuver, { color: inkSoft }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
          {!!current?.instruction && (
            <Text style={[styles.instruction, { color: ink }]} numberOfLines={2}>
              {current.instruction}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          {onToggleVoice && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                voiceEnabled
                  ? {
                      backgroundColor: imminent
                        ? 'rgba(255,255,255,0.22)'
                        : heroColors.surfaceStrong,
                    }
                  : {
                      borderWidth: 1,
                      borderColor: imminent ? 'rgba(255,255,255,0.4)' : heroColors.line,
                    },
              ]}
              onPress={onToggleVoice}
              accessibilityLabel={t(voiceEnabled ? 'navigation.voiceOn' : 'navigation.voiceOff')}
            >
              <Ionicons
                name={voiceEnabled ? 'volume-medium' : 'volume-mute'}
                size={16}
                color={ink}
              />
            </TouchableOpacity>
          )}
          {onOpenCueList && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  borderWidth: 1,
                  borderColor: imminent ? 'rgba(255,255,255,0.4)' : heroColors.line,
                },
              ]}
              onPress={onOpenCueList}
              accessibilityLabel={t('navigation.allDirections')}
            >
              <Ionicons name="list" size={16} color={ink} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <View
          style={[
            styles.track,
            { backgroundColor: imminent ? 'rgba(255,255,255,0.3)' : heroColors.track },
          ]}
        >
          <View
            style={[
              styles.fill,
              {
                width: `${Math.round(legProgress * 100)}%`,
                backgroundColor: imminent ? '#ffffff' : '#60A5FA',
              },
            ]}
          />
        </View>

        <View style={styles.footerRow}>
          {after ? (
            <View style={styles.thenRow}>
              <Text style={[styles.thenLabel, { color: inkSoft }]}>{t('navigation.then')}</Text>
              <Ionicons name={turnIcon(after.maneuver)} size={13} color={ink} />
              <Text style={[styles.thenText, { color: ink }]} numberOfLines={1}>
                {after.instruction}
              </Text>
            </View>
          ) : (
            <Text style={[styles.thenText, { color: inkSoft }]} numberOfLines={1}>
              {t('navigation.lastInstruction')}
            </Text>
          )}
          <Text style={[styles.remaining, { color: inkSoft }]}>
            {t('navigation.left', { distance: formatDistance(remaining) })}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl + 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  offRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: heroColors.red,
  },
  offRouteText: {
    color: '#ffffff',
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  headline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  distance: {
    fontSize: msFont(25),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
  },
  maneuver: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  instruction: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: 3,
  },
  actions: {
    gap: spacing.xs + 2,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  track: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  thenRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    minWidth: 0,
  },
  thenLabel: {
    fontSize: msFont(10),
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  thenText: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  remaining: {
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
});
