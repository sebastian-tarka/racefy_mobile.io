import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontFamily, fontSize, fontWeight, ms, msFont, spacing } from '../../theme';
import type { StrengthSessionSummary } from '../../types/api';
import { StrengthSectionLabel } from './StrengthSectionLabel';
import { hasStrengthSession, restFlex, rhythmItems, setLabel } from './strengthSession';

/** Below this the blocks get unreadable, so the strip scrolls sideways instead. */
const MIN_STRIP_WIDTH = ms(640);

/**
 * The workout on one line: sets as blocks, rests between them as bars whose
 * width follows their length. Takes the place of the map on the activity screen.
 */
export function StrengthRhythm({
  session,
}: {
  session: StrengthSessionSummary | null | undefined;
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  if (!hasStrengthSession(session)) return null;
  const { items, legend } = rhythmItems(session);
  if (items.length === 0) return null;

  const seriesColor = (i: number) => colors.series[i % colors.series.length];
  const setCount = items.filter((i) => i.kind === 'set').length;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
      ]}
    >
      <StrengthSectionLabel>{t('activities.strength.rhythm')}</StrengthSectionLabel>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        {t('activities.strength.rhythmHint')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('activities.strength.rhythmA11y', {
          sets: setCount,
          exercises: legend.length,
        })}
      >
        <View style={[styles.strip, { minWidth: MIN_STRIP_WIDTH }]}>
          {items.map((item) => {
            if (item.kind === 'separator') {
              return (
                <View
                  key={item.key}
                  style={[styles.separator, { backgroundColor: colors.textMuted }]}
                />
              );
            }
            if (item.kind === 'set') {
              return (
                <View
                  key={item.key}
                  style={[styles.block, { backgroundColor: seriesColor(item.colorIndex) }]}
                >
                  <Text
                    style={[styles.blockText, { color: colors.cardBackground }]}
                    numberOfLines={1}
                  >
                    {setLabel(item.set, i18n.language)}
                  </Text>
                </View>
              );
            }
            return (
              <View key={item.key} style={[styles.rest, { flex: restFlex(item.seconds) }]}>
                <View style={[styles.restBar, { backgroundColor: colors.textMuted }]} />
                <Text style={[styles.restText, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.seconds ? `${item.seconds}s` : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.legend}>
        {legend.map((l) => (
          <View key={`${l.colorIndex}-${l.name}`} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: seriesColor(l.colorIndex) }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]} numberOfLines={1}>
              {l.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  hint: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  scroll: {
    marginTop: spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
  },
  strip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: ms(40),
    gap: 2,
  },
  separator: {
    width: 1,
    height: ms(40),
    marginHorizontal: 6,
    opacity: 0.5,
  },
  block: {
    flex: 2,
    minWidth: ms(44),
    height: ms(34),
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 2,
  },
  blockText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  rest: {
    minWidth: 6,
    alignItems: 'stretch',
    gap: 2,
  },
  restBar: {
    height: 3,
    borderRadius: 2,
    opacity: 0.6,
  },
  restText: {
    fontFamily: fontFamily.mono,
    fontSize: msFont(9),
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: spacing.xs,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  swatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: fontSize.xs,
    flexShrink: 1,
  },
});
