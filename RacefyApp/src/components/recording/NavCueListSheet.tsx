import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { turnIcon, turnLabelKey } from '../../utils/navigationCues';
import { borderRadius, fontSize, msFont, spacing } from '../../theme';
import type { RouteTurnInstruction } from '../../types/api';

/** The route layer's blue — same one the map draws planned routes in. */
const ROUTE_BLUE = '#2563EB';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  turns: RouteTurnInstruction[];
  /**
   * Metres covered along the route. Zero before the start, which is exactly
   * what makes the same sheet work on the pre-start screen: nothing is passed
   * and the first instruction is the next one.
   */
  distanceAlong?: number;
}

/**
 * Every instruction on the route, as a timeline (design "Racefy v2" →
 * CueListSheet).
 *
 * The banner answers "what now"; this answers "what am I in for" before the
 * start and "what did I miss" during. Passed instructions stay in place, dimmed
 * rather than removed, so the list never renumbers under the athlete's thumb.
 */
export function NavCueListSheet({ visible, onClose, title, turns, distanceAlong = 0 }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatDistance } = useUnits();
  const insets = useSafeAreaInsets();

  const nextIndex = turns.findIndex((turn) => turn.distance_along > distanceAlong);
  const total = turns.length ? formatDistance(turns[turns.length - 1].distance_along) : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.md },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t('navigation.cueCount', { count: turns.length })}
              {total ? ` · ${total}` : ''}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={t('common.close')}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {turns.map((turn, index) => {
            const passed = nextIndex < 0 || index < nextIndex;
            const isNext = index === nextIndex;
            const last = index === turns.length - 1;

            return (
              <View
                key={`${turn.distance_along}-${index}`}
                style={[styles.row, passed && styles.rowPassed]}
              >
                <View style={styles.rail}>
                  <View
                    style={[
                      styles.railIcon,
                      {
                        backgroundColor: isNext ? ROUTE_BLUE : colors.cardBackground,
                        borderColor: isNext ? ROUTE_BLUE : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={turnIcon(turn.maneuver)}
                      size={17}
                      color={isNext ? '#ffffff' : ROUTE_BLUE}
                    />
                  </View>
                  {!last && <View style={[styles.railLine, { backgroundColor: colors.border }]} />}
                </View>

                <View style={[styles.body, last && { paddingBottom: 0 }]}>
                  <View style={styles.bodyHead}>
                    <Text style={[styles.maneuver, { color: colors.textPrimary }]}>
                      {t(turnLabelKey(turn.maneuver))}
                    </Text>
                    <Text style={[styles.at, { color: colors.textMuted }]}>
                      {formatDistance(turn.distance_along)}
                    </Text>
                    {isNext && (
                      <View style={[styles.badge, { backgroundColor: ROUTE_BLUE }]}>
                        <Text style={styles.badgeText}>{t('navigation.next')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.instruction, { color: colors.textSecondary }]}>
                    {turn.instruction}
                  </Text>
                </View>
              </View>
            );
          })}

          {turns.length === 0 && (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              {t('navigation.noCues')}
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,26,20,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowPassed: {
    opacity: 0.45,
  },
  rail: {
    width: 34,
    alignItems: 'center',
  },
  railIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railLine: {
    flex: 1,
    width: 2,
    minHeight: 22,
  },
  body: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  bodyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  maneuver: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  at: {
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: msFont(9),
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  instruction: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    paddingVertical: spacing.xl,
  },
});
