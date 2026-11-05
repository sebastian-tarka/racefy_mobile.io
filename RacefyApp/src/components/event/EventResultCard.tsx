import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../Avatar';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { fixStorageUrl } from '../../config/api';
import { borderRadius, fontSize, msFont, spacing, withAlpha } from '../../theme';
import { formatTotalTime } from '../../utils/formatters';
import { type RankedRow, metricForMode, rowUsername } from '../../utils/eventStandings';
import { formatPrimaryMetric } from './EventLiveResults';
import { BibBox } from './LiveMyPlaceCard';
import type { EventRankingMode, EventViewerResult } from '../../types/api';

interface EventResultCardProps {
  result: EventViewerResult;
  rankingMode: EventRankingMode | undefined;
  /** "Udostępnij wynik" — only offered for a finished result. */
  onShare?: () => void;
  onViewActivity?: (activityId: number) => void;
}

/**
 * "Twój wynik" (design 4a–4d): the participant's own outcome after the event —
 * place of N, the three metrics, record / points / badges chips, share and the way
 * to the activity. Provisional until the organizer finalizes.
 */
export function EventResultCard({
  result,
  rankingMode,
  onShare,
  onViewActivity,
}: EventResultCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const units = useUnits();
  const m = result.metrics;

  let label: string;
  let main: string;
  let sub: string | null = null;
  switch (result.state) {
    case 'finished':
      label = result.provisional
        ? t('eventResult.labelProvisional', 'Your result · provisional')
        : t('eventResult.labelFinished', 'Your result · finished');
      main =
        result.place != null
          ? t('eventResult.placeOf', {
              place: result.place,
              total: result.participants_ranked ?? '—',
            })
          : t('eventResult.finishedLabel', 'Finished');
      if (result.team) {
        sub = t('eventResult.team', {
          name: result.team.name,
          place: result.team.place ?? '—',
        });
      }
      break;
    case 'dnf':
      label = t('eventResult.labelDnf', 'Your result');
      main = t('eventResult.dnf', 'Did not finish');
      sub = result.reason ? t(`eventResult.reason.${result.reason}`) : null;
      break;
    case 'recording':
    case 'in_progress':
      label = t('eventResult.labelOpen', 'Your result');
      if (result.reason) {
        // Saved, but the event does not count it (no GPS track, outside the event's dates,
        // impossible speed) — said while there is still time to record another one.
        main = t('eventResult.notCounted', 'Activity not counted');
        sub = t(`eventResult.reason.${result.reason}`);
      } else {
        main = t('eventResult.open', 'Activity still open');
        sub = t('eventResult.openNote', 'Finish and save it — the result will be counted.');
      }
      break;
    default:
      label = t('eventResult.labelNotStarted', 'Your result');
      main = t('eventResult.notStarted', 'No activity recorded');
  }

  const metricKey = metricForMode(rankingMode);
  const stats = m
    ? [
        {
          key: 'time',
          label: t('eventResult.time', 'Time'),
          value: formatTotalTime(m.duration),
        },
        metricKey === 'duration' && m.distance > 0
          ? {
              key: 'pace',
              label: t('eventResult.pace', 'Pace'),
              value: units.formatPaceWithUnit(m.distance, m.duration),
            }
          : {
              key: 'distance',
              label: t('eventResult.distance', 'Distance'),
              value: units.formatDistanceShort(m.distance),
            },
        {
          key: 'elevation',
          label: t('eventResult.elevation', 'Climb'),
          value: units.formatElevation(m.elevation_gain),
        },
      ]
    : [];

  const chips: {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    text: string;
    color: string;
  }[] = [];
  if (result.state === 'finished') {
    if (result.is_personal_record) {
      chips.push({
        key: 'pr',
        icon: 'flash',
        text: t('eventResult.personalRecord', 'Personal record'),
        color: colors.warning,
      });
    }
    if (result.points_awarded != null && result.points_awarded > 0) {
      chips.push({
        key: 'points',
        icon: 'star',
        text: t('eventResult.points', { n: result.points_awarded }),
        color: colors.primary,
      });
    } else if (result.provisional) {
      chips.push({
        key: 'points-later',
        icon: 'time-outline',
        text: t('eventResult.pointsLater', 'Points after approval'),
        color: colors.textMuted,
      });
    }
    for (const badge of result.badges) {
      chips.push({
        key: `badge-${badge.id}`,
        icon: 'ribbon',
        text: badge.translation_key ? t(badge.translation_key, badge.name) : badge.name,
        color: colors.ai,
      });
    }
  }

  const canShare = result.state === 'finished' && !!onShare;
  const activityId = result.activity_id;

  return (
    <Card testID="event-result-card">
      <View style={styles.head}>
        {result.registration_number != null && <BibBox bib={result.registration_number} />}
        <View style={styles.headText}>
          <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={1}>
            {label.toUpperCase()}
          </Text>
          <Text style={[styles.main, { color: colors.textPrimary }]}>{main}</Text>
          {sub ? <Text style={[styles.sub, { color: colors.textSecondary }]}>{sub}</Text> : null}
        </View>
      </View>

      {stats.length > 0 && (
        <View style={[styles.stats, { borderColor: colors.border }]}>
          {stats.map((s, i) => (
            <View
              key={s.key}
              style={[styles.stat, i > 0 && { borderLeftColor: colors.border, borderLeftWidth: 1 }]}
            >
              <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {s.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {s.label.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {chips.length > 0 && (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <View
              key={chip.key}
              style={[styles.chip, { backgroundColor: withAlpha(chip.color, 0.14) }]}
            >
              <Ionicons name={chip.icon} size={13} color={chip.color} />
              <Text style={[styles.chipText, { color: chip.color }]} numberOfLines={1}>
                {chip.text}
              </Text>
            </View>
          ))}
        </View>
      )}

      {(canShare || (activityId != null && onViewActivity)) && (
        <View style={styles.actions}>
          {canShare && (
            <TouchableOpacity
              style={[styles.primary, { backgroundColor: colors.primary }]}
              onPress={onShare}
              activeOpacity={0.85}
              accessibilityRole="button"
              testID="event-result-share"
            >
              <Ionicons name="share-social" size={18} color={colors.onPrimary} />
              <Text style={[styles.primaryText, { color: colors.onPrimary }]}>
                {t('resultShare.open', 'Share result')}
              </Text>
            </TouchableOpacity>
          )}
          {activityId != null && onViewActivity && (
            <TouchableOpacity
              style={[
                styles.secondary,
                { borderColor: colors.border, backgroundColor: colors.cardBackground },
              ]}
              onPress={() => onViewActivity(activityId)}
              activeOpacity={0.85}
              accessibilityRole="button"
              testID="event-result-view-activity"
            >
              <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
                {t('eventResult.viewActivity', 'View activity')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Card>
  );
}

interface EventWinnerCardProps {
  winner: RankedRow;
  rankingMode: EventRankingMode | undefined;
  finishers: number;
  /** Everyone with an event activity (finishers + DNF). */
  participants: number;
  dnfCount: number;
  onProfilePress?: (username: string) => void;
}

/** "Zwycięzca" (design 4c) — what a spectator sees instead of "Twój wynik". */
export function EventWinnerCard({
  winner,
  rankingMode,
  finishers,
  participants,
  dnfCount,
  onProfilePress,
}: EventWinnerCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const units = useUnits();
  const username = rowUsername(winner);
  const name = winner.team?.name ?? winner.user?.name ?? '—';

  return (
    <Card testID="event-winner-card">
      <View style={styles.head}>
        <Avatar
          uri={fixStorageUrl(winner.user?.avatar_url ?? winner.user?.avatar ?? null)}
          variants={winner.user?.avatar_variants}
          name={name}
          size="lg"
        />
        <View style={styles.headText}>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {t('eventResult.winner', 'Winner').toUpperCase()}
          </Text>
          <Text style={[styles.main, { color: colors.textPrimary }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            {formatPrimaryMetric(winner, rankingMode, units)}
          </Text>
        </View>
      </View>
      <Text style={[styles.sub, styles.winnerNote, { color: colors.textMuted }]}>
        {t('eventResult.finishedOf', { finished: finishers, total: participants })}
        {dnfCount > 0 ? ` · ${t('eventResult.dnfCount', { count: dnfCount })}` : ''}
      </Text>
      {username && onProfilePress ? (
        <TouchableOpacity
          style={[
            styles.secondary,
            styles.winnerAction,
            { borderColor: colors.border, backgroundColor: colors.cardBackground },
          ]}
          onPress={() => onProfilePress(username)}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
            {t('eventResult.congratulate', 'See the winner')}
          </Text>
        </TouchableOpacity>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
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
  stats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: msFont(10),
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    flexShrink: 1,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  primary: {
    height: 50,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  secondary: {
    height: 46,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  winnerNote: {
    marginTop: spacing.sm,
  },
  winnerAction: {
    marginTop: spacing.md,
  },
});
