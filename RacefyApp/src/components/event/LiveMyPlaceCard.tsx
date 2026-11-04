import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { LivePulse } from '../recording/LivePulse';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { borderRadius, fontSize, msFont, spacing } from '../../theme';
import { formatTotalTime } from '../../utils/formatters';
import {
  type EventTarget,
  type MetricKey,
  type RankedRow,
  eventTarget,
  gapToNeighbour,
} from '../../utils/eventStandings';
import { formatPrimaryMetric } from './EventLiveResults';
import type { Event, EventRankingMode } from '../../types/api';

/** The bib number tile ("NR 142") used by "Your place" and "Your result". */
export function BibBox({ bib }: { bib: number | string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View
      style={[styles.bib, { borderColor: colors.primary, backgroundColor: colors.background }]}
      accessibilityLabel={`${t('eventLive.me.bib', 'BIB')} ${bib}`}
    >
      <Text style={[styles.bibLabel, { color: colors.textMuted }]}>
        {t('eventLive.me.bib', 'BIB')}
      </Text>
      <Text style={[styles.bibNumber, { color: colors.textPrimary }]}>{bib}</Text>
    </View>
  );
}

/** Progress bar with the amount covered on the left and the goal on the right. */
function GoalProgress({
  value,
  target,
  format,
}: {
  value: number;
  target: EventTarget;
  format: (key: MetricKey, value: number) => string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const pct = target.value > 0 ? Math.min(1, Math.max(0, value / target.value)) : 0;
  return (
    <View style={styles.goal}>
      <View
        style={[styles.goalTrack, { backgroundColor: colors.borderLight }]}
        accessibilityRole="progressbar"
        accessibilityLabel={t('eventLive.me.goal', 'Progress to goal')}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      >
        <View
          style={[
            styles.goalFill,
            { backgroundColor: colors.primary, width: `${Math.round(pct * 100)}%` },
          ]}
        />
      </View>
      <View style={styles.goalRow}>
        <Text style={[styles.goalText, { color: colors.textPrimary }]}>
          {format(target.key, value)}
          <Text style={{ color: colors.textMuted }}> · {Math.round(pct * 100)}%</Text>
        </Text>
        <Text style={[styles.goalText, { color: colors.textMuted }]}>
          {t('eventLive.me.goalOf', { goal: format(target.key, target.value) })}
        </Text>
      </View>
    </View>
  );
}

interface LiveMyPlaceCardProps {
  event: Event;
  rows: RankedRow[];
  rankingMode: EventRankingMode | undefined;
  /** The viewer's own row, if they have an event activity. */
  me: RankedRow | null;
  /** The viewer's team row in a team event. */
  team?: RankedRow | null;
  /** The way into recording. `recording` = an activity is already running. */
  cta: {
    recording: boolean;
    onStart: () => void;
    onResume: () => void;
    /** "Start activity →" while something else is recording: explains why not. */
    onBusy: () => void;
  };
}

/**
 * "Twoje miejsce" — the registered viewer during a live event (design 1a, 2b–2e):
 * bib number, position with the ranking metric, gap to the person ahead (or the lead),
 * progress to the event goal, and the single action that follows: start, or get back
 * to the recording.
 */
export function LiveMyPlaceCard({ event, rows, rankingMode, me, team, cta }: LiveMyPlaceCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const units = useUnits();

  const bib = event.user_registration?.registration_number;
  const target = eventTarget(event);
  const gap = gapToNeighbour(rows, me, rankingMode);
  const format = (key: MetricKey, value: number) =>
    key === 'elevation'
      ? units.formatElevation(value)
      : key === 'duration'
        ? formatTotalTime(value)
        : units.formatDistanceShort(value);

  let label = t('eventLive.me.notStarted', 'Your place');
  let main = t('eventLive.me.notStartedMain', "You haven't started yet");
  let sub: string | null = t('eventLive.me.recordInApp', 'Your result appears once you record.');

  if (me) {
    label = me.isRecording
      ? t('eventLive.me.onCourse', "You're on course")
      : me.isFinished
        ? t('eventLive.me.finished', 'Finished')
        : t('eventLive.me.yourPlace', 'Your place');
    main = t('eventLive.me.position', {
      n: me.position,
      metric: formatPrimaryMetric(me, rankingMode, units),
    });
    if (gap?.kind === 'time') {
      sub = gap.leader
        ? t('eventLive.me.leadTime', { time: formatTotalTime(gap.seconds) })
        : t('eventLive.me.behindTime', { time: formatTotalTime(gap.seconds), place: gap.place });
    } else if (gap?.kind === 'metric') {
      sub = gap.leader
        ? t('eventLive.me.leadMetric', { amount: format(gap.key, gap.amount) })
        : t('eventLive.me.behindMetric', { amount: format(gap.key, gap.amount), place: gap.place });
    } else {
      sub = null;
    }
  }
  if (team?.team) {
    label = t('eventLive.me.yourTeam', { name: team.team.name });
  }

  const progress = me && target ? me[target.key] : null;
  // One activity per event and it is done: nothing more to start.
  const showStart = !(me?.isFinished && !event.allow_multiple_activities);

  return (
    <Card testID="live-my-place">
      <View style={styles.head}>
        {bib != null && <BibBox bib={bib} />}
        <View style={styles.headText}>
          <View style={styles.labelRow}>
            {me?.isRecording ? <LivePulse color={colors.primary} size={6} /> : null}
            <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={1}>
              {label.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.main, { color: colors.textPrimary }]}>{main}</Text>
          {sub ? <Text style={[styles.sub, { color: colors.textSecondary }]}>{sub}</Text> : null}
        </View>
      </View>

      {progress != null && target ? (
        <GoalProgress value={progress} target={target} format={format} />
      ) : null}

      {showStart &&
        (cta.recording ? (
          <>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.textPrimary }]}
              onPress={cta.onResume}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <LivePulse color={colors.primary} size={7} />
              <Text style={[styles.buttonText, { color: colors.background }]}>
                {t('eventPin.backToActivity')}
              </Text>
            </TouchableOpacity>
            {!me?.isRecording && (
              <TouchableOpacity onPress={cta.onBusy} style={styles.busyLink} hitSlop={HIT_SLOP}>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  {t('eventPin.startActivity')} →
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={cta.onStart}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('eventPin.startActivity')}
          >
            <Ionicons name="play" size={18} color={colors.onPrimary} />
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
              {t('eventPin.startActivity')}
            </Text>
          </TouchableOpacity>
        ))}
      {showStart && !cta.recording && !me ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{t('eventPin.startSub')}</Text>
      ) : null}
    </Card>
  );
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  busyLink: {
    alignSelf: 'center',
    marginTop: spacing.xs,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  main: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    lineHeight: msFont(26),
  },
  sub: {
    fontSize: fontSize.sm,
  },
  bib: {
    minWidth: 68,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  bibLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bibNumber: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  goal: {
    marginTop: spacing.md,
    gap: 6,
  },
  goalTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  button: {
    marginTop: spacing.md,
    height: 50,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  hint: {
    marginTop: spacing.xs,
    textAlign: 'center',
    fontSize: fontSize.xs,
  },
});
