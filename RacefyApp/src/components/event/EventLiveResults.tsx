import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';
import { Avatar } from '../Avatar';
import { useTheme } from '../../hooks/useTheme';
import type { useUnits } from '../../hooks/useUnits';
import { normalizeStanding } from '../../hooks/useEventStandings';
import { borderRadius, fontSize, spacing } from '../../theme';
import { fixStorageUrl } from '../../config/api';
import { formatTotalTime } from '../../utils/formatters';
import type {
  EventRankingMode,
  EventResult,
  EventStandingEntry,
  EventStandingUser,
  User,
} from '../../types/api';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

// ---------------------------------------------------------------------------
// Shared row model + builders (used by the inline detail preview and the
// dedicated Live / Results screens).
// ---------------------------------------------------------------------------
export interface StandingRowModel {
  place: number;
  userId?: number;
  name: string;
  avatar: string | null;
  subtitle?: string;
  primary: string;
  finished: boolean;
}

type Units = ReturnType<typeof useUnits>;

function avatarOf(user: EventStandingUser | User | undefined): string | null {
  if (!user) return null;
  const raw = (user as EventStandingUser).avatar_url ?? (user as EventStandingUser).avatar ?? null;
  return fixStorageUrl(raw);
}

export function standingToRow(
  entry: EventStandingEntry,
  mode: EventRankingMode | undefined,
  units: Units,
  t: TFunction,
): StandingRowModel {
  const n = normalizeStanding(entry);
  let primary: string;
  switch (mode) {
    case 'most_distance':
      primary = units.formatDistanceShort(n.distance);
      break;
    case 'most_elevation':
      primary = units.formatElevation(n.elevationGain);
      break;
    default:
      primary = n.duration > 0 ? formatTotalTime(n.duration) : '—';
  }
  return {
    place: entry.position,
    userId: entry.user?.id,
    name: entry.user?.name ?? '—',
    avatar: avatarOf(entry.user),
    subtitle: entry.is_finished ? t('eventDetail.finished', 'Finished') : undefined,
    primary,
    finished: entry.is_finished,
  };
}

export function resultToRow(
  result: EventResult,
  mode: EventRankingMode | undefined,
  units: Units,
): StandingRowModel {
  let primary: string;
  switch (mode) {
    case 'most_distance':
      primary =
        result.formatted_distance ??
        (result.distance != null ? units.formatDistanceShort(result.distance) : '—');
      break;
    case 'most_elevation':
      primary = result.elevation_gain != null ? units.formatElevation(result.elevation_gain) : '—';
      break;
    default:
      primary =
        result.formatted_duration ??
        (result.duration != null ? formatTotalTime(result.duration) : '—');
  }
  return {
    place: result.place,
    userId: result.user?.id,
    name: result.user?.name ?? result.team?.name ?? '—',
    avatar: avatarOf(result.user),
    subtitle: result.place_label,
    primary,
    finished: true,
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
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statTile, { borderColor: colors.border }]}>
      <View style={styles.statTileHead}>
        <Ionicons name={icon} size={13} color={color ?? colors.textMuted} />
        <Text style={[styles.statTileLabel, { color: colors.textMuted }]}>
          {label.toUpperCase()}
        </Text>
      </View>
      <Text style={[styles.statTileValue, { color: colors.textPrimary }]}>
        {value}
        {unit ? (
          <Text style={[styles.statTileUnit, { color: colors.textMuted }]}> {unit}</Text>
        ) : null}
      </Text>
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
  const barHeights: Record<number, number> = { 1: 74, 2: 54, 3: 42 };

  return (
    <View style={styles.podium}>
      {columns.map((row) => (
        <View key={row.place} style={styles.podiumCol}>
          <View style={styles.podiumAvatarWrap}>
            <Avatar uri={row.avatar} name={row.name} size={row.place === 1 ? 'lg' : 'md'} />
            <View style={[styles.podiumMedal, { backgroundColor: MEDAL_COLORS[row.place - 1] }]}>
              <Text style={styles.podiumMedalText}>{row.place}</Text>
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
                height: barHeights[row.place],
                backgroundColor: row.place === 1 ? colors.primary : colors.primaryLight + '30',
              },
            ]}
          >
            <Text
              style={[styles.podiumBarNum, { color: row.place === 1 ? '#fff' : colors.primary }]}
            >
              {row.place}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Standing / result row
// ---------------------------------------------------------------------------
export function StandingRow({
  row,
  isCurrentUser,
}: {
  row: StandingRowModel;
  isCurrentUser?: boolean;
}) {
  const { colors } = useTheme();
  const medal = row.place <= 3 ? MEDAL_COLORS[row.place - 1] : null;
  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.border,
          backgroundColor: isCurrentUser ? colors.primaryLight + '14' : 'transparent',
        },
      ]}
    >
      <Text style={[styles.rowRank, { color: medal ?? colors.textMuted }]}>{row.place}</Text>
      <Avatar uri={row.avatar} name={row.name} size="sm" />
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>
          {row.name}
        </Text>
        {row.subtitle ? (
          <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
            {row.subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{row.primary}</Text>
    </View>
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
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statTileValue: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  statTileUnit: {
    fontSize: fontSize.sm,
    fontWeight: '600',
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
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  rowValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
