import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { formatDistance, formatTotalTime } from '../utils/formatters';
import { spacing, fontSize, borderRadius } from '../theme';
import type { NavigationState } from '../hooks/useLiveNavigation';

interface NavigationOverlayProps {
  navigation: NavigationState;
}

function getTurnIconName(maneuver: string): keyof typeof Ionicons.glyphMap {
  if (maneuver.includes('left')) return 'arrow-back';
  if (maneuver.includes('right')) return 'arrow-forward';
  if (maneuver.includes('u-turn')) return 'return-down-back';
  return 'arrow-up';
}

export function NavigationOverlay({ navigation: nav }: NavigationOverlayProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!nav.isActive) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Off-route warning */}
      {nav.isOffRoute && (
        <View style={[styles.offRouteBanner, { backgroundColor: '#ef4444' }]}>
          <Ionicons name="warning" size={18} color="#fff" />
          <Text style={styles.offRouteText}>
            {t('navigation.offRoute', 'Off route')} — {nav.distanceFromRoute}m
          </Text>
        </View>
      )}

      {/* Next turn card */}
      {nav.nextTurn && nav.distanceToTurn !== null && (
        <View style={[styles.turnCard, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.turnIconBox, { backgroundColor: colors.primary }]}>
            <Ionicons
              name={getTurnIconName(nav.nextTurn.maneuver)}
              size={24}
              color="#fff"
            />
          </View>
          <View style={styles.turnInfo}>
            <Text style={[styles.turnDistance, { color: colors.textPrimary }]}>
              {formatDistance(nav.distanceToTurn)}
            </Text>
            <Text style={[styles.turnInstruction, { color: colors.textSecondary }]} numberOfLines={1}>
              {nav.nextTurn.instruction}
            </Text>
          </View>
        </View>
      )}

      {/* Bottom stats bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatDistance(nav.distanceRemaining)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('navigation.remaining', 'Remaining')}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${Math.round(nav.progress * 100)}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {Math.round(nav.progress * 100)}%
          </Text>
        </View>

        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {nav.eta ? formatTotalTime(nav.eta) : '--'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('navigation.eta', 'ETA')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  offRouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
  },
  offRouteText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  turnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  turnIconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  turnInfo: {
    flex: 1,
  },
  turnDistance: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  turnInstruction: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stat: {
    alignItems: 'center',
    minWidth: 60,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    marginTop: 2,
  },
});
