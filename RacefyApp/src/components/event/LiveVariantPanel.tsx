import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../Avatar';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { fixStorageUrl } from '../../config/api';
import { borderRadius, fontSize, msFont, spacing } from '../../theme';
import {
  type MetricKey,
  type RankedRow,
  eventTarget,
  progressToTarget,
  sumBy,
} from '../../utils/eventStandings';
import type { Event } from '../../types/api';

const EVEREST_M = 8849;
const MAX_MARKERS = 6;

interface LiveVariantPanelProps {
  event: Event;
  rows: RankedRow[];
  /** The viewer's team row in a team event. */
  myTeam?: RankedRow | null;
  currentUserId?: number | null;
}

/**
 * The picture that fits the event's rules (design round 2):
 * - team event      → the viewer's team as one stacked bar (member contribution)
 * - goal challenge  → everyone together vs. the goal, how many reached it
 * - course race     → athletes on a 0…distance line, finishers at the flag
 * Nothing when the event has no target and no team — the table says it all.
 */
export function LiveVariantPanel({ event, rows, myTeam, currentUserId }: LiveVariantPanelProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const units = useUnits();
  const target = eventTarget(event);
  const fmt = (key: MetricKey, value: number) =>
    key === 'elevation' ? units.formatElevation(value) : units.formatDistanceShort(value);

  // ---- Team: who carries the total -------------------------------------
  if (myTeam && myTeam.memberRows.length > 0 && myTeam.team) {
    const key: MetricKey = event.ranking_mode === 'most_elevation' ? 'elevation' : 'distance';
    const total = sumBy(myTeam.memberRows, key);
    const members = [...myTeam.memberRows].sort((a, b) => b[key] - a[key]);
    const shades = [colors.primary, colors.info, colors.warning, colors.ai, colors.success];

    return (
      <Card testID="live-variant-team">
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('eventLive.viz.team', { name: myTeam.team.name })}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{fmt(key, total)}</Text>
        <View style={styles.stack}>
          {members.map((m, i) => (
            <View
              key={m.key}
              style={[
                styles.stackPart,
                { backgroundColor: shades[i % shades.length], flexGrow: Math.max(m[key], 0.01) },
              ]}
            />
          ))}
        </View>
        <View style={styles.legend}>
          {members.map((m, i) => {
            const me = m.user?.id === currentUserId;
            return (
              <View key={m.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: shades[i % shades.length] }]} />
                <Text
                  style={[
                    styles.legendText,
                    { color: me ? colors.textPrimary : colors.textSecondary },
                    me && styles.legendMe,
                  ]}
                  numberOfLines={1}
                >
                  {me ? t('eventLive.you', 'You') : (m.user?.name ?? '—')}{' '}
                  <Text style={{ color: colors.textMuted }}>{fmt(key, m[key])}</Text>
                </Text>
              </View>
            );
          })}
        </View>
      </Card>
    );
  }

  if (!target) return null;

  // ---- Goal challenge: everyone together -------------------------------
  if (event.allow_multiple_activities) {
    const total = sumBy(rows, target.key);
    const reached = rows.filter((r) => r[target.key] >= target.value).length;
    const reachedPct = rows.length > 0 ? reached / rows.length : 0;
    const everest =
      target.key === 'elevation' && total >= EVEREST_M
        ? t('eventLive.viz.everest', { n: (total / EVEREST_M).toFixed(1) })
        : null;

    return (
      <Card testID="live-variant-goal">
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('eventLive.viz.goal', { goal: fmt(target.key, target.value) })}
        </Text>
        <View style={styles.line}>
          <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>
            {t('eventLive.viz.together', 'Everyone together')}
          </Text>
          <Text style={[styles.lineValue, { color: colors.textPrimary }]}>
            {fmt(target.key, total)}
            {everest ? <Text style={{ color: colors.textMuted }}> · {everest}</Text> : null}
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.borderLight }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: colors.primary, width: `${Math.round(reachedPct * 100)}%` },
            ]}
          />
        </View>
        <View style={styles.line}>
          <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>
            {t('eventLive.viz.reached', 'Reached the goal')}
          </Text>
          <Text style={[styles.lineValue, { color: colors.textPrimary }]}>
            {t('eventLive.viz.reachedCount', { n: reached, total: rows.length })}
          </Text>
        </View>
      </Card>
    );
  }

  // ---- Course race: who is where between start and finish --------------
  if (target.key !== 'distance') return null;
  const racers = rows.filter((r) => r.isRecording);
  const finished = rows.filter((r) => r.isFinished).length;
  const markers = [
    ...racers.slice(0, MAX_MARKERS),
    ...racers.slice(MAX_MARKERS).filter((r) => r.user?.id === currentUserId),
  ];

  return (
    <Card testID="live-variant-course">
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t('eventLive.viz.course', { distance: fmt('distance', target.value) })}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {t('eventLive.viz.courseNote', { racing: racers.length, finished })}
      </Text>
      <View style={styles.course}>
        <View style={[styles.courseLine, { backgroundColor: colors.border }]} />
        {markers.map((r) => {
          const me = r.user?.id === currentUserId;
          const pct = progressToTarget(r, target);
          return (
            <View
              key={r.key}
              style={[
                styles.marker,
                {
                  left: `${Math.round(pct * 100)}%`,
                  borderColor: me ? colors.primary : colors.cardBackground,
                },
              ]}
            >
              <Avatar
                uri={fixStorageUrl(r.user?.avatar_url ?? r.user?.avatar ?? null)}
                variants={r.user?.avatar_variants}
                name={r.user?.name ?? '?'}
                size="sm"
              />
            </View>
          );
        })}
        <View style={[styles.flag, { backgroundColor: colors.textPrimary }]}>
          <Text style={[styles.flagText, { color: colors.background }]}>
            {t('eventLive.viz.finish', 'FINISH')}
          </Text>
        </View>
      </View>
      <View style={styles.axis}>
        <Text style={[styles.axisText, { color: colors.textMuted }]}>0</Text>
        <Text style={[styles.axisText, { color: colors.textMuted }]}>
          {fmt('distance', target.value / 2)}
        </Text>
        <Text style={[styles.axisText, { color: colors.textMuted }]}>
          {fmt('distance', target.value)}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.xs,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  stack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    gap: 2,
    marginTop: spacing.md,
  },
  stackPart: {
    flexBasis: 0,
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '48%',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: fontSize.xs,
    flexShrink: 1,
  },
  legendMe: {
    fontWeight: '700',
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  lineLabel: {
    fontSize: fontSize.sm,
  },
  lineValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  course: {
    height: 56,
    marginTop: spacing.md,
    marginHorizontal: 14,
    justifyContent: 'center',
  },
  courseLine: {
    height: 4,
    borderRadius: 2,
  },
  marker: {
    position: 'absolute',
    top: 10,
    marginLeft: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flag: {
    position: 'absolute',
    right: -14,
    top: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  flagText: {
    fontSize: msFont(9),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  axisText: {
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
});
