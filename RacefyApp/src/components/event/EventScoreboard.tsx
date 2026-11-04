import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../theme';
import { PodiumTop3, StandingRow, type StandingRowModel, StatTile } from './EventLiveResults';

export interface ScoreboardTile {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  unit?: string;
  note?: string;
  color?: string;
  live?: boolean;
}

export interface ScoreboardGroup {
  key: string;
  /** "Finished · 3 of 48", "On course · 45" */
  title: string;
  rows: StandingRowModel[];
}

interface EventScoreboardProps {
  tiles: ScoreboardTile[];
  individualRows: StandingRowModel[];
  /**
   * Optional split of the individual list into titled groups (live time modes:
   * finished first, then on course). The flat `individualRows` still feed the podium.
   */
  individualGroups?: ScoreboardGroup[];
  teamRows?: StandingRowModel[];
  currentUserId?: number | null;
  /** Section title above the standings list, e.g. "Live standings" / "Final standings". */
  listTitle: string;
  emptyText: string;
  /** Podium above the list (default true). */
  showPodium?: boolean;
  podiumLabel?: string;
  /** Row tap → the activity (only rows with an activity id are tappable). */
  onRowPress?: (row: StandingRowModel) => void;
}

/** Tiles (2-up grid) + podium + Individual/Teams tabs + standings list. */
export function EventScoreboard({
  tiles,
  individualRows,
  individualGroups,
  teamRows = [],
  currentUserId,
  listTitle,
  emptyText,
  showPodium = true,
  podiumLabel,
  onRowPress,
}: EventScoreboardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tab, setTab] = useState<'individual' | 'teams'>('individual');
  const hasTeams = teamRows.length > 0;
  const showingTeams = tab === 'teams' && hasTeams;
  const podiumRows = showingTeams ? teamRows : individualRows;

  const groups: ScoreboardGroup[] = showingTeams
    ? [{ key: 'teams', title: '', rows: teamRows }]
    : individualGroups && individualGroups.length > 0
      ? individualGroups
      : [{ key: 'individual', title: '', rows: individualRows }];
  const isEmpty = groups.every((g) => g.rows.length === 0);

  const youLabel = t('eventLive.you', 'You');
  const onCourseLabel = t('eventLive.onCourse', 'On course');
  const finishedLabel = t('eventLive.finished', 'Finished');

  return (
    <View style={styles.container}>
      {tiles.length > 0 && (
        <View style={styles.tiles}>
          {tiles.map((tile) => (
            <View key={tile.label} style={styles.tileWrap}>
              <StatTile {...tile} />
            </View>
          ))}
        </View>
      )}

      {showPodium && podiumRows.some((r) => r.place === 1) && (
        <>
          <Text style={[styles.podiumLabel, { color: colors.textMuted }]}>
            {(podiumLabel ?? t('eventDetail.podium', 'Podium')).toUpperCase()}
          </Text>
          <PodiumTop3 rows={podiumRows.slice(0, 3)} />
        </>
      )}

      <View style={styles.listHeader}>
        <Text style={[styles.listTitle, { color: colors.textMuted }]}>
          {listTitle.toUpperCase()}
        </Text>
        {hasTeams && (
          <View style={[styles.tabs, { backgroundColor: colors.borderLight }]}>
            {(['individual', 'teams'] as const).map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.tab, tab === value && { backgroundColor: colors.cardBackground }]}
                onPress={() => setTab(value)}
                testID={`scoreboard-tab-${value}`}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: tab === value ? colors.textPrimary : colors.textMuted },
                  ]}
                >
                  {value === 'individual'
                    ? t('eventDetail.individual', 'Individual')
                    : t('eventDetail.teams', 'Teams')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {isEmpty ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>{emptyText}</Text>
      ) : (
        <View>
          {groups.map((group) => (
            <View key={group.key}>
              {group.title ? (
                <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
                  {group.title}
                </Text>
              ) : null}
              {group.rows.map((row) => (
                <StandingRow
                  key={row.key}
                  row={row}
                  isCurrentUser={
                    currentUserId != null && row.userId != null && row.userId === currentUserId
                  }
                  youLabel={youLabel}
                  onCourseLabel={onCourseLabel}
                  finishedLabel={finishedLabel}
                  onPress={onRowPress}
                />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tileWrap: {
    flexGrow: 1,
    flexBasis: '46%',
  },
  podiumLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  listTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  groupTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    padding: 3,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  empty: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
