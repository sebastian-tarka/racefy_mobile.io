import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';
import { Avatar } from '../Avatar';
import { LivePulse } from '../recording/LivePulse';
import { useTheme } from '../../hooks/useTheme';
import type { useUnits } from '../../hooks/useUnits';
import { borderRadius, fontSize, msFont, spacing, withAlpha } from '../../theme';
import { fixStorageUrl } from '../../config/api';
import { formatTotalTime } from '../../utils/formatters';
import {
  type EventTarget,
  type RankedRow,
  isAscendingMode,
  metricForMode,
  progressToTarget,
  rowUsername,
} from '../../utils/eventStandings';
import type { EventRankingMode, ImageVariants } from '../../types/api';

// Medal colours are a sporting convention readable without a legend, not palette accents.
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

// ---------------------------------------------------------------------------
// Row model: what one standings / results / DNF row shows. Built from `RankedRow`
// by `rankedRowToModel`; rendered by `StandingRow`, `PodiumTop3`.
// ---------------------------------------------------------------------------
export interface StandingRowModel {
  key: string;
  /** null → did not finish ("—"). */
  place: number | null;
  userId?: number | null;
  /** null when anonymised (no profile to open). */
  username?: string | null;
  name: string;
  avatar: string | null;
  avatar_variants?: ImageVariants | null;
  /** "@anna · 3 activities", "4 members · 2 on course", "Finished"… */
  subtitle?: string;
  /** The ranking metric, formatted. */
  primary: string;
  /** A second line under the metric: pace, or the DNF reason. */
  secondary?: string;
  finished: boolean;
  /** On course right now — pulse dot + "on course". */
  recording?: boolean;
  dnf?: boolean;
  /** 0…1 to the event target while not finished (live goal bar). */
  progress?: number | null;
  /** Opens the activity when set. */
  activityId?: number | null;
}

type Units = ReturnType<typeof useUnits>;

interface RowModelOptions {
  mode: EventRankingMode | undefined;
  units: Units;
  t: TFunction;
  /** Live goal bar for unfinished rows. */
  target?: EventTarget | null;
}

/** The ranking metric of a row, formatted for its mode. */
export function formatPrimaryMetric(
  row: Pick<RankedRow, 'distance' | 'duration' | 'elevation'>,
  mode: EventRankingMode | undefined,
  units: Units,
): string {
  switch (metricForMode(mode)) {
    case 'distance':
      return units.formatDistanceShort(row.distance);
    case 'elevation':
      return units.formatElevation(row.elevation);
    default:
      return row.duration > 0 ? formatTotalTime(row.duration) : '—';
  }
}

/** Name of the metric that decides the ranking ("Time" / "Distance" / "Elevation"). */
export function primaryMetricLabel(mode: EventRankingMode | undefined, t: TFunction): string {
  switch (metricForMode(mode)) {
    case 'distance':
      return t('eventLive.metric.distance', 'Distance');
    case 'elevation':
      return t('eventLive.metric.elevation', 'Elevation');
    default:
      return t('eventLive.metric.time', 'Time');
  }
}

function avatarUrlOf(row: RankedRow): string | null {
  const raw = row.user?.avatar_url ?? row.user?.avatar ?? null;
  return fixStorageUrl(raw);
}

/** Row model for an individual, team, result or DNF row. */
export function rankedRowToModel(row: RankedRow, opts: RowModelOptions): StandingRowModel {
  const { mode, units, t, target } = opts;
  const isTeam = !!row.team;
  const name = (isTeam ? row.team?.name : row.user?.name) || '—';

  let subtitle: string | undefined;
  if (isTeam) {
    const parts = [
      t('eventLive.membersCount', { count: row.memberRows.length }),
      row.finishedCount > 0
        ? t('eventLive.membersFinished', {
            finished: row.finishedCount,
            total: row.memberRows.length,
          })
        : null,
      row.recordingCount > 0 ? t('eventLive.teamOnCourse', { count: row.recordingCount }) : null,
    ].filter(Boolean);
    subtitle = parts.join(' · ');
  } else {
    const parts = [
      rowUsername(row) ? `@${rowUsername(row)}` : null,
      row.activitiesCount != null && row.activitiesCount > 1
        ? t('eventLive.activitiesCount', { count: row.activitiesCount })
        : null,
    ].filter(Boolean);
    subtitle = parts.length ? parts.join(' · ') : undefined;
  }

  let secondary: string | undefined;
  if (row.isDnf) {
    secondary = row.dnfReason ? t(`eventResult.reasonShort.${row.dnfReason}`) : undefined;
  } else if (!isTeam && isAscendingMode(mode) && row.distance > 0 && row.duration > 0) {
    secondary = units.formatPaceWithUnit(row.distance, row.duration);
  } else if (!isTeam && !isAscendingMode(mode) && row.duration > 0) {
    secondary = formatTotalTime(row.duration);
  }

  return {
    key: row.key,
    place: row.isDnf ? null : row.position,
    userId: row.user?.id ?? null,
    username: rowUsername(row),
    name,
    avatar: isTeam ? null : avatarUrlOf(row),
    avatar_variants: isTeam ? null : (row.user?.avatar_variants ?? null),
    subtitle,
    primary: row.isDnf ? t('eventResult.dnfShort', 'DNF') : formatPrimaryMetric(row, mode, units),
    secondary,
    finished: row.isFinished,
    recording: row.isRecording && !row.isFinished,
    dnf: row.isDnf,
    progress:
      target && !row.isFinished && !row.isDnf && !isTeam ? progressToTarget(row, target) : null,
    activityId: row.activityId,
  };
}

// ---------------------------------------------------------------------------
// StatTile
// ---------------------------------------------------------------------------
export function StatTile({
  icon,
  label,
  value,
  unit,
  note,
  color,
  live,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  unit?: string;
  /** Small line under the value ("of 48 spots", "Marek W."). */
  note?: string;
  color?: string;
  /** Pulse dot in the corner — "on course now". */
  live?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statTile, { borderColor: colors.border }]}>
      <View style={styles.statTileHead}>
        <Ionicons name={icon} size={13} color={color ?? colors.textMuted} />
        <Text style={[styles.statTileLabel, { color: colors.textMuted }]} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
        {live ? <LivePulse color={colors.primary} size={6} /> : null}
      </View>
      <Text style={[styles.statTileValue, { color: colors.textPrimary }]} numberOfLines={1}>
        {value}
        {unit ? (
          <Text style={[styles.statTileUnit, { color: colors.textMuted }]}> {unit}</Text>
        ) : null}
      </Text>
      {note ? (
        <Text style={[styles.statTileNote, { color: colors.textMuted }]} numberOfLines={1}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Podium (top 3)
// ---------------------------------------------------------------------------
export function PodiumTop3({ rows }: { rows: StandingRowModel[] }) {
  const { colors } = useTheme();
  if (rows.length === 0) return null;
  const first = rows.find((r) => r.place === 1);
  const second = rows.find((r) => r.place === 2);
  const third = rows.find((r) => r.place === 3);
  const columns = [second, first, third].filter(Boolean) as StandingRowModel[];
  if (!first) return null;
  const barHeights: Record<number, number> = { 1: 74, 2: 54, 3: 42 };

  return (
    <View style={styles.podium}>
      {columns.map((row) => {
        const place = row.place ?? 0;
        return (
          <View key={row.key} style={styles.podiumCol}>
            <View style={styles.podiumAvatarWrap}>
              <Avatar
                uri={row.avatar}
                variants={row.avatar_variants}
                name={row.name}
                size={place === 1 ? 'lg' : 'md'}
              />
              <View style={[styles.podiumMedal, { backgroundColor: MEDAL_COLORS[place - 1] }]}>
                <Text style={styles.podiumMedalText}>{place}</Text>
              </View>
            </View>
            <Text style={[styles.podiumName, { color: colors.textPrimary }]} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={[styles.podiumValue, { color: colors.textSecondary }]} numberOfLines={1}>
              {row.primary}
            </Text>
            <View
              style={[
                styles.podiumBar,
                {
                  height: barHeights[place],
                  backgroundColor:
                    place === 1 ? colors.primary : withAlpha(colors.primaryLight, 0.19),
                },
              ]}
            >
              <Text
                style={[
                  styles.podiumBarNum,
                  { color: place === 1 ? colors.onPrimary : colors.primary },
                ]}
              >
                {place}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Standing / result / DNF row
// ---------------------------------------------------------------------------
export function StandingRow({
  row,
  isCurrentUser,
  youLabel,
  onCourseLabel,
  finishedLabel,
  onPress,
}: {
  row: StandingRowModel;
  isCurrentUser?: boolean;
  /** "You" tag next to the viewer's own name. */
  youLabel?: string;
  onCourseLabel?: string;
  finishedLabel?: string;
  onPress?: (row: StandingRowModel) => void;
}) {
  const { colors } = useTheme();
  const medal = row.place != null && row.place <= 3 ? MEDAL_COLORS[row.place - 1] : null;
  const status = row.recording ? onCourseLabel : row.finished ? finishedLabel : undefined;
  const pressable = !!onPress && !!row.activityId;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          borderBottomColor: colors.border,
          backgroundColor: isCurrentUser ? withAlpha(colors.primaryLight, 0.08) : 'transparent',
        },
      ]}
      onPress={pressable ? () => onPress?.(row) : undefined}
      disabled={!pressable}
      activeOpacity={0.7}
      testID={`standing-row-${row.key}`}
    >
      <Text
        style={[styles.rowRank, { color: medal ?? colors.textMuted }]}
        accessibilityLabel={row.place != null ? String(row.place) : 'DNF'}
      >
        {row.place ?? '—'}
      </Text>
      <Avatar uri={row.avatar} variants={row.avatar_variants} name={row.name} size="sm" />
      <View style={styles.rowInfo}>
        <View style={styles.rowNameLine}>
          <Text
            style={[styles.rowName, { color: row.dnf ? colors.textSecondary : colors.textPrimary }]}
            numberOfLines={1}
          >
            {row.name}
          </Text>
          {isCurrentUser && youLabel ? (
            <Text style={[styles.rowYou, { color: colors.primary }]}>{youLabel.toUpperCase()}</Text>
          ) : null}
        </View>
        {row.subtitle ? (
          <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
            {row.subtitle}
          </Text>
        ) : null}
        {row.progress != null ? (
          <View style={[styles.rowProgressTrack, { backgroundColor: colors.borderLight }]}>
            <View
              style={[
                styles.rowProgressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${Math.round(row.progress * 100)}%`,
                },
              ]}
            />
          </View>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowValue, { color: row.dnf ? colors.textMuted : colors.textPrimary }]}>
          {row.primary}
        </Text>
        {row.secondary ? (
          <Text style={[styles.rowSecondary, { color: colors.textMuted }]} numberOfLines={1}>
            {row.secondary}
          </Text>
        ) : null}
        {status ? (
          <View style={styles.rowStatus}>
            {row.recording ? <LivePulse color={colors.primary} size={6} /> : null}
            <Text
              style={[
                styles.rowStatusText,
                { color: row.recording ? colors.primary : colors.textMuted },
              ]}
            >
              {status.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  statTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  statTileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  statTileLabel: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statTileValue: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statTileUnit: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  statTileNote: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
  },
  podiumAvatarWrap: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  podiumMedal: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    minHeight: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumMedalText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  podiumName: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  podiumValue: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  podiumBar: {
    width: '100%',
    borderTopLeftRadius: borderRadius.sm,
    borderTopRightRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumBarNum: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowRank: {
    width: 22,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowName: {
    flexShrink: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  rowYou: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rowSub: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  rowProgressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    maxWidth: 160,
    overflow: 'hidden',
  },
  rowProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rowSecondary: {
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  rowStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  rowStatusText: {
    fontSize: msFont(10),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
